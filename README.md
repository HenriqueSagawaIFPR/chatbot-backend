# Documentação do Servidor Node.js para o Chatbot Terra Plana

## Visão Geral
Este projeto é uma implementação em Node.js do backend do chatbot de Terra Plana, originalmente desenvolvido em Next.js. O servidor fornece um endpoint de API que processa mensagens do usuário e retorna respostas geradas pelo modelo Gemini da Google, simulando um defensor da teoria da Terra Plana.

**Atualização B2.P1.A7**: Implementação de sistema de logs centralizado e ranking de bots para a "Vitrine de Bots do IIW2023A".

## Estrutura do Projeto
```
chatbot-terra-plana-node/
├── src/
│   ├── index.js         # Servidor Express e endpoints principais
│   ├── config/
│   │   └── db.js        # Configuração de conexões com MongoDB
│   ├── models/
│   │   ├── Chat.js      # Modelo para conversas
│   │   └── Log.js       # Modelos para logs (original e novo)
│   ├── services/
│   │   └── logService.js # Serviço de gerenciamento de logs
│   └── lib/
│       └── gemini.js    # Lógica de integração com a API Gemini
├── .env                 # Variáveis de ambiente (chaves de API)
├── .env.example         # Exemplo de variáveis de ambiente necessárias
├── package.json         # Dependências e scripts
└── test.js              # Script para testar o endpoint
```

## Requisitos
- Node.js (versão 16 ou superior)
- Chave de API do Google Generative AI (Gemini)
- MongoDB Atlas (banco compartilhado fornecido pelo professor)

## Instalação
1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env`
   - Adicione suas chaves de API no arquivo `.env`
   - Configure a string de conexão do MongoDB Atlas compartilhado

## Configuração das Variáveis de Ambiente
```env
# MongoDB Atlas Compartilhado (Atividade B2.P1.A7)
MONGO_URI=mongodb+srv://user_log_acess:Log4c3ss2025@cluster0.nbt3sks.mongodb.net/IIW2023A_Logs?retryWrites=true&w=majority&appName=Cluster0

# MongoDB Principal (para dados do chat)
MONGODB_URI=mongodb+srv://user_log_acess:Log4c3ss2025@cluster0.nbt3sks.mongodb.net/chatbot_terra_plana?retryWrites=true&w=majority&appName=Cluster0

# API do Google Gemini
GEMINI_API_KEY=sua_chave_api_gemini_aqui

# Porta do servidor
PORT=3000
```

## Uso
1. Inicie o servidor:
   ```
   npm start
   ```
2. O servidor estará disponível em `http://localhost:3000`

## Endpoints

### Endpoints Principais

#### GET /
- **Descrição**: Verifica se o servidor está funcionando
- **Resposta**: `{ "message": "API do Chatbot Terra Plana está funcionando!" }`

#### POST /api/chat
- **Descrição**: Processa mensagens do usuário e retorna respostas do chatbot
- **Corpo da Requisição**:
  ```json
  {
    "message": "String com a mensagem do usuário",
    "chatId": "ID do chat existente (opcional)"
  }
  ```
- **Resposta**:
  ```json
  {
    "response": "String com a resposta do chatbot",
    "chatId": "ID do chat (novo ou existente)"
  }
  ```

#### GET /api/chats
- **Descrição**: Lista todas as conversas (apenas ID e título)
- **Resposta**: Array de objetos com `_id`, `title`, `createdAt`, `updatedAt`

#### GET /api/chats/:id
- **Descrição**: Busca uma conversa específica com mensagens
- **Resposta**: Objeto completo do chat com array de mensagens

### Novos Endpoints (B2.P1.A7)

#### POST /api/log-connection
- **Descrição**: Registra logs de acesso do usuário no MongoDB Atlas compartilhado
- **Corpo da Requisição**:
  ```json
  {
    "ip": "IP do usuário",
    "acao": "Ação realizada (ex: 'acesso_inicial_chatbot')"
  }
  ```
- **Resposta**:
  ```json
  {
    "message": "Log de acesso registrado com sucesso",
    "data": {
      "ip": "IP do usuário",
      "acao": "Ação realizada",
      "nomeBot": "Vagner Terraplanista"
    }
  }
  ```

#### POST /api/ranking/registrar-acesso-bot
- **Descrição**: Registra acesso ao bot para o sistema de ranking
- **Corpo da Requisição**:
  ```json
  {
    "botId": "ID único do bot",
    "nomeBot": "Nome do bot",
    "timestampAcesso": "Timestamp do acesso (opcional)",
    "usuarioId": "ID do usuário (opcional)"
  }
  ```
- **Resposta**:
  ```json
  {
    "message": "Acesso ao bot [nome] registrado para ranking."
  }
  ```

#### GET /api/ranking/visualizar
- **Descrição**: Visualiza os dados do ranking de bots
- **Resposta**: Array ordenado por contagem de acessos

### Endpoints de Debug

#### GET /api/logs
- **Descrição**: Visualiza logs de conversas (desenvolvimento)
- **Resposta**: Array dos últimos 100 logs

#### GET /api/logs-access
- **Descrição**: Visualiza logs de acesso (desenvolvimento)
- **Resposta**: Array dos últimos 100 logs de acesso

## Estrutura da Coleção de Logs (tb_cl_user_log_acess)

A coleção no MongoDB Atlas compartilhado segue a estrutura especificada:

```javascript
{
  col_data: "YYYY-MM-DD",      // Data do acesso
  col_hora: "HH:MM:SS",        // Hora do acesso
  col_IP: "IP do usuário",     // IP do usuário
  col_nome_bot: "Nome do Bot", // Nome do bot
  col_acao: "Ação realizada"   // Ação do usuário
}
```

### Exemplos de Ações Registradas:
- `acesso_inicial_chatbot` - Primeiro acesso ao chatbot
- `enviou_mensagem_chatbot` - Usuário enviou uma mensagem
- `recebeu_resposta_chatbot` - Usuário recebeu resposta
- `erro_processamento_mensagem` - Erro no processamento

## Sistema de Ranking

O sistema de ranking é simulado em memória no servidor e inclui:
- Contagem de acessos por bot
- Timestamp do último acesso
- Ordenação por número de acessos

## Funcionalidades
- Processamento de mensagens do usuário
- Integração com a API Gemini da Google
- Sistema de logs centralizado no MongoDB Atlas compartilhado
- Sistema de ranking de bots
- Gerenciamento de conversas com persistência
- Logs detalhados de todas as interações

## Testes
Para testar o endpoint principal, execute:
```
node test.js
```

## Deploy no Render

1. Configure as variáveis de ambiente no Render:
   - `MONGO_URI`: String de conexão do MongoDB Atlas compartilhado
   - `MONGODB_URI`: String de conexão do MongoDB principal
   - `GEMINI_API_KEY`: Chave da API do Google Gemini

2. O servidor será automaticamente implantado e estará disponível na URL fornecida pelo Render.

## Diferenças em Relação ao Backend Original
- Implementação em Node.js puro com Express, em vez de Next.js
- Sistema de logs centralizado no MongoDB Atlas compartilhado
- Sistema de ranking de bots
- Persistência de conversas
- Mesma lógica de negócio e fluxo de processamento
- Mesmas integrações com APIs externas
