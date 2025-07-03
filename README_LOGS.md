# Configuração de Logs do Chatbot

## Visão Geral

Este projeto agora possui duas conexões MongoDB:
1. **Conexão Principal**: Armazena os dados dos chats e mensagens
2. **Conexão de Logs**: Armazena logs detalhados de todas as interações

## Configuração das Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend/` com as seguintes variáveis:

```env
# Configuração do MongoDB Principal
MONGODB_URI=mongodb+srv://seu_usuario:sua_senha@seu_cluster.mongodb.net/seu_banco?retryWrites=true&w=majority

# Configuração do MongoDB para Logs
MONGODB_LOG_URI=mongodb+srv://computaria531:jOjTCffIemeCKSaM@cluster0.tef8hdx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Configuração da API do Gemini
GEMINI_API_KEY=sua_chave_api_gemini

# Porta do servidor
PORT=3000
```

## Estrutura dos Logs

Cada log contém as seguintes informações:

- **botName**: "Vagner Terraplanista" (fixo)
- **userName**: "Henrique Sagawa" (fixo)
- **chatId**: ID da conversa
- **message**: Mensagem do usuário
- **response**: Resposta do bot
- **messageType**: "user" ou "bot"
- **timestamp**: Data e hora da interação
- **ipAddress**: IP do usuário
- **userAgent**: Navegador/dispositivo do usuário
- **sessionId**: ID da sessão (se disponível)
- **processingTime**: Tempo de processamento em milissegundos
- **status**: "success", "error" ou "pending"
- **errorMessage**: Mensagem de erro (se houver)

## Rotas de Log

### GET /api/logs
Retorna os últimos 100 logs ordenados por timestamp (mais recentes primeiro).

**Resposta:**
```json
[
  {
    "botName": "Vagner Terraplanista",
    "userName": "Henrique Sagawa",
    "message": "Olá, como você está?",
    "response": "Olá! Estou funcionando perfeitamente...",
    "messageType": "bot",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "processingTime": 1250,
    "status": "success"
  }
]
```

## Funcionalidades Implementadas

1. **Log Automático**: Toda mensagem enviada e resposta recebida é automaticamente logada
2. **Informações Detalhadas**: IP, User-Agent, tempo de processamento, etc.
3. **Tratamento de Erros**: Erros também são logados com detalhes
4. **Conexão Separada**: Logs ficam em banco separado para não afetar performance
5. **Índices Otimizados**: Consultas rápidas por timestamp e outros campos

## Como Usar

1. Configure as variáveis de ambiente no arquivo `.env`
2. Inicie o servidor: `npm start`
3. As mensagens serão automaticamente logadas
4. Acesse `/api/logs` para visualizar os logs

## Monitoramento

Os logs são úteis para:
- Monitorar uso do chatbot
- Analisar performance (tempo de resposta)
- Identificar erros e problemas
- Análise de comportamento dos usuários
- Auditoria de conversas 