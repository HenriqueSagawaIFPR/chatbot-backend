// Arquivo de teste para validar o funcionamento do servidor
// Este script simula uma requisição para o endpoint /api/chat

import fetch from 'node-fetch';

async function testChatEndpoint() {
  try {
    console.log('Testando o endpoint /api/chat...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Olá, a Terra é plana?',
        history: []
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Resposta do servidor:');
    console.log(data);
    
    return data;
  } catch (error) {
    console.error('Erro ao testar o endpoint:', error);
  }
}

// Executa o teste
testChatEndpoint();
