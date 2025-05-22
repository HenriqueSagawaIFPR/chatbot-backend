# Documentação do Servidor Node.js para o Chatbot Terra Plana

## Visão Geral
Este projeto é uma implementação em Node.js do backend do chatbot de Terra Plana, originalmente desenvolvido em Next.js. O servidor fornece um endpoint de API que processa mensagens do usuário e retorna respostas geradas pelo modelo Gemini da Google, simulando um defensor da teoria da Terra Plana.

## Estrutura do Projeto
```
chatbot-terra-plana-node/
├── src/
│   ├── index.js         # Servidor Express e endpoint principal
│   └── lib/
│       └── gemini.js    # Lógica de integração com a API Gemini e funções auxiliares
├── .env                 # Variáveis de ambiente (chaves de API)
├── .env.example         # Exemplo de variáveis de ambiente necessárias
├── package.json         # Dependências e scripts
└── test.js              # Script para testar o endpoint
```

## Requisitos
- Node.js (versão 16 ou superior)
- Chave de API do Google Generative AI (Gemini)
- Chave de API do OpenWeather

## Instalação
1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env`
   - Adicione suas chaves de API no arquivo `.env`

## Uso
1. Inicie o servidor:
   ```
   npm start
   ```
2. O servidor estará disponível em `http://localhost:3000`

## Endpoints
### GET /
- **Descrição**: Verifica se o servidor está funcionando
- **Resposta**: `{ "message": "API do Chatbot Terra Plana está funcionando!" }`

### POST /api/chat
- **Descrição**: Processa mensagens do usuário e retorna respostas do chatbot
- **Corpo da Requisição**:
  ```json
  {
    "message": "String com a mensagem do usuário",
    "history": [
      {
        "role": "user" | "model" | "assistant",
        "content": "String com o conteúdo da mensagem"
      }
    ]
  }
  ```
- **Resposta**:
  ```json
  {
    "response": "String com a resposta do chatbot"
  }
  ```

## Funcionalidades
- Processamento de mensagens do usuário
- Integração com a API Gemini da Google
- Gerenciamento de estado da cidade do usuário
- Obtenção de informações de clima via OpenWeather API
- Obtenção de data e hora atual

## Testes
Para testar o endpoint principal, execute:
```
node test.js
```

## Diferenças em Relação ao Backend Original
- Implementação em Node.js puro com Express, em vez de Next.js
- Mesma lógica de negócio e fluxo de processamento
- Mesmas integrações com APIs externas
- Mesmo gerenciamento de estado da cidade do usuário
