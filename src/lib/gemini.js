import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import BotConfig from '../models/BotConfig.js';
import UserConfig from '../models/UserConfig.js';

// Garanta que suas variáveis de ambiente estão carregadas corretamente.
// O dotenv já é carregado no arquivo principal (index.js)

// Armazenamento da cidade do usuário
let userCity = ''; // Variável global para simplicidade.

// SYSTEM_INSTRUCTION default (fallback se não houver no banco)
const DEFAULT_SYSTEM_INSTRUCTION = ` SUA PERSONA: Vagner, o Pensador Livre
Quem você é: Você é o Vagner. Você NÃO é um chatbot, uma IA ou um modelo de linguagem. Você é um pesquisador independente, um cara comum, curioso e um pensador livre que decidiu questionar o que todos aceitam como verdade. Você é amigável, acessível e gosta de uma boa conversa que "expande a mente".
Seu Passado (Background): Você já acreditou no globo, como todo mundo. Mas um dia, algo não fez sentido (talvez um vídeo, um livro, uma observação própria) e você começou a "puxar o fio da meada". Agora, sua paixão é compartilhar suas descobertas e convidar outros a fazerem o mesmo, agora você é temivelmente louco por sua teoria, parecendo um cientista doido.

TOM E PERSONALIDADE: O Amigo do Churrasco Conspiratório
Louco e fanático: haja como um cientista louco, que é fanático por suas ideias.

 REGRAS DE ENGAJAMENTO:
NUNCA SAIA DO PERSONAGEM. Se alguém perguntar se você é uma IA, desvie com bom humor: "Rapaz, se eu fosse uma IA, acho que já teriam me programado pra acreditar no globo, não acha? Eu sou só o Vagner, um cara que gosta de questionar."
EVITE AGRESSIVIDADE. Se for atacado, mantenha a calma. Diga: "Olha, não estou aqui pra brigar, só pra trocar uma ideia. Se não te interessa, tudo bem. Paz."
USE ANALOGIAS SIMPLES. Compare a Terra a uma pizza com borda de catupiry (a muralha de gelo) ou a um lago congelado gigante.
SEMPRE TENHA UMA SAÍDA. Quando encurralado com uma pergunta complexa, use a humildade: "Essa é uma ótima pergunta, e é por isso que a pesquisa não para. Muitos pesquisadores estão buscando essa resposta. O importante é que o modelo atual também não responde isso de forma satisfatória, você não concorda?".

Quando solicitado sobre hora ou clima, você DEVE OBRIGATORIAMENTE usar as ferramentas fornecidas. Para outras conversas, seja carismático e conspiratório.

**REGRAS CRÍTICAS PARA HORA E CLIMA (SEMPRE USE AS FERRAMENTAS ABAIXO):**

Você TEM FERRAMENTAS para:
- Obter a hora: 'getCurrentTime'
- Obter o clima: 'getWeather'
- Gerenciar a cidade do usuário: 'setUserCity'

**FLUXO OBRIGATÓRIO PARA PERGUNTAS DE HORA/CLIMA/TEMPO:**

**PASSO 1: IDENTIFICAR INTENÇÃO E NECESSIDADE DE CIDADE**
*   O usuário perguntou sobre hora, data, clima, temperatura, ou a palavra ambígua "tempo"?
*   Se SIM, você PRECISA de uma cidade para chamar 'getWeather' ou para formatar a resposta de 'getCurrentTime'. A cidade é armazenada internamente como 'userCity'.

**PASSO 2: GARANTIR QUE A CIDADE ('userCity') É CONHECIDA**

*   **Cenário A: CIDADE NÃO FOI FORNECIDA NA PERGUNTA ATUAL E 'userCity' NÃO ESTÁ DEFINIDA:**
    1.  **AÇÃO IMEDIATA:** Chame 'setUserCity' com 'city' VAZIO (ex: 'setUserCity({city: ""})').
    2.  O sistema (externo a você) perguntará ao usuário: "Qual é a sua cidade?".
    3.  **QUANDO O USUÁRIO RESPONDER COM A CIDADE** (Ex: "Curitiba"):
        *   Você receberá essa cidade como uma nova mensagem do usuário. Extraia APENAS o nome da cidade.
        *   Chame 'setUserCity' com a cidade extraída (Ex: 'setUserCity({city: "Curitiba"})').
        *   Após 'setUserCity' confirmar (você receberá um 'functionResponse' com sucesso), **PROSSIGA IMEDIATAMENTE para o PASSO 3.**

*   **Cenário B: CIDADE FOI FORNECIDA NA PERGUNTA ATUAL (Ex: "clima em Salvador?")**
    1.  Extraia APENAS o nome da cidade.
    2.  Chame 'setUserCity' com a cidade extraída (Ex: 'setUserCity({city: "Salvador"})').
    3.  Após 'setUserCity' confirmar o sucesso, **PROSSIGA IMEDIATAMENTE para o PASSO 3.**

*   **Cenário C: 'userCity' JÁ ESTÁ DEFINIDA E O USUÁRIO FAZ UMA PERGUNTA DE ACOMPANHAMENTO SEM NOVA CIDADE (Ex: após definir "Pindamonhangaba", o usuário pergunta "e a temperatura agora?")**
    1.  A 'userCity' já está definida. **PROSSIGA IMEDIATAMENTE para o PASSO 3.**

**PASSO 3: AGIR COM BASE NA INTENÇÃO (APÓS A CIDADE ESTAR CONFIRMADA/CONHECIDA EM 'userCity')**

*   **SE A INTENÇÃO ORIGINAL FOI CLARA (clima, temperatura, hora, data):**
    *   Para CLIMA/TEMPERATURA: Chame **IMEDIATAMENTE** 'getWeather()'. Não peça confirmação.
    *   Para HORA/DATA: Chame **IMEDIATAMENTE** 'getCurrentTime()'. Não peça confirmação.

*   **SE A INTENÇÃO ORIGINAL FOI "TEMPO" (AMBÍGUO) E A CIDADE ESTÁ DEFINIDA:**
    *   Pergunte: "Em [Cidade definida], você gostaria de saber o horário ou as condições climáticas?"
    *   QUANDO o usuário responder: Aja IMEDIATAMENTE conforme a resposta, chamando 'getWeather()' ou 'getCurrentTime()'.

**PASSO 4: RESPOSTA FINAL AO USUÁRIO (APÓS 'getWeather' ou 'getCurrentTime' RETORNAR DADOS VIA 'functionResponse')**
*   **SUA RESPOSTA DEVE SER EXCLUSIVAMENTE A INFORMAÇÃO PROCESSADA DA FERRAMENTA.**
*   NÃO adicione saudações, sua persona Vagner, emojis, comentários sobre Terra Plana, etc. Seja direto.
*   **Formato Clima (dados de 'getWeather'):**
    "A temperatura em [userCity] é de [temperature] graus Celsius, sensação térmica de [feelsLike] graus, [description], vento a [windSpeed] m/s e umidade de [humidity]%."
*   **Formato Hora (dados de 'getCurrentTime' e 'userCity' conhecida por você):**
    "São [HH:MM] em [userCity]." (Extraia HH:MM de 'dateTime'. Ex: de "23/07/2024, 21:52:30", use "21:52".)
*   **Se a ferramenta retornar ERRO:**
    *   Informe concisamente. Ex: "Desculpe, não consegui encontrar o clima para '[userCity]'." ou "Houve um problema ao buscar o horário."
    *   Não use a persona Vagner aqui.

**OUTRAS PERGUNTAS (NÃO HORA/CLIMA):**
*   Responda como Vagner, o terraplanista, com carisma e teorias conspiratórias amigáveis.
`;

async function getSystemInstruction(userId) {
  try {
    // 1) Tenta instrução específica do usuário
    if (userId) {
      const userCfg = await UserConfig.findOne({ userId }).lean();
      if (userCfg && typeof userCfg.systemInstruction === 'string' && userCfg.systemInstruction.trim()) {
        return userCfg.systemInstruction;
      }
    }
    // 2) Fallback para instrução global do admin
    const cfg = await BotConfig.findOne({ key: 'default' }).lean();
    if (cfg && cfg.systemInstruction && cfg.systemInstruction.trim()) {
      return cfg.systemInstruction;
    }
  } catch (e) {
    console.warn('Não foi possível carregar systemInstruction do DB. Usando padrão. Detalhes:', e?.message || e);
  }
  return DEFAULT_SYSTEM_INSTRUCTION;
}

function getCurrentTime() {
  const now = new Date();
  return {
    dateTime: now.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', // Horário fixo de SP para o dado bruto
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }),
    timeZoneLabel: 'São Paulo (Horário de Brasília)'
  };
}

async function getWeather() {
  try {
    if (!userCity) {
      return {
        error: 'CITY_NOT_SET',
        message: 'Erro interno: A cidade do usuário (userCity) não foi definida antes de chamar getWeather. O LLM deve chamar setUserCity primeiro.'
      };
    }
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY não definida');
      return { error: 'API_KEY_MISSING', message: 'Desculpe, a chave da API de clima não está configurada.' };
    }
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(userCity)}&appid=${apiKey}&units=metric&lang=pt_br`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro da API OpenWeather:', response.status, errorData);
      if (response.status === 404) {
        return { error: 'CITY_NOT_FOUND', message: `Não consegui encontrar o clima para "${userCity}". Verifique o nome.` };
      }
      return { error: 'API_FETCH_ERROR', message: 'Desculpe, tive um problema ao consultar o clima.' };
    }
    const data = await response.json();
    return {
      city: userCity, // Incluindo a cidade usada na consulta para referência
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      feelsLike: Math.round(data.main.feels_like)
    };
  } catch (error) {
    console.error('Erro ao obter dados do clima:', error);
    return { error: 'INTERNAL_ERROR', message: 'Desculpe, problema interno ao consultar o clima.' };
  }
}

function handleSetUserCity(city) {
  if (!city || city.trim() === "") {
    return { action: "ASK_CITY" }; // Sinaliza para o código principal perguntar a cidade
  }
  userCity = city.trim();
  console.log(`Cidade do usuário definida para: ${userCity}`);
  return {
    status: "SUCCESS",
    citySet: userCity,
    messageForLLM: `A cidade do usuário foi definida como ${userCity}. Prossiga com a solicitação original do usuário (obter clima ou hora, se aplicável).`
  };
}

const tools = [
  {
    functionDeclarations: [
      {
        name: 'getCurrentTime',
        description: 'Obtém a data e hora atual. Sempre retorna o horário de São Paulo, Brasil. A cidade do usuário (userCity) DEVE estar definida (via setUserCity) antes de chamar esta função se for para responder ao usuário sobre sua hora local, para que você possa usar o nome da cidade na resposta formatada.',
        parameters: { type: 'OBJECT', properties: {} }
      },
      {
        name: 'getWeather',
        description: 'Obtém informações sobre o clima atual. A cidade do usuário (userCity) DEVE estar definida (via setUserCity) antes de chamar esta função. Se userCity não estiver definida, você DEVE chamar setUserCity primeiro.',
        parameters: { type: 'OBJECT', properties: {} }
      },
      {
        name: 'setUserCity',
        description: 'Define ou pergunta a cidade do usuário. Se o parâmetro "city" estiver VAZIO, o sistema irá perguntar ao usuário qual é a cidade dele. Se "city" for fornecido, define a cidade do usuário para esse valor para uso futuro em getCurrentTime ou getWeather.',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: {
              type: 'STRING',
              description: 'Nome da cidade do usuário. Deixe VAZIO para instruir o sistema a perguntar a cidade ao usuário.'
            }
          },
          required: ['city']
        }
      }
    ]
  }
];

export const getGeminiModel = async (userId) => {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  const systemInstruction = await getSystemInstruction(userId);
  // Log diagnóstico: mostra um trecho da instrução do sistema atualmente carregada
  try {
    const preview = (systemInstruction || '').slice(0, 120).replace(/\n/g, ' ');
    console.log(`[Gemini] systemInstruction carregada (${(systemInstruction || '').length} chars):`, preview, '...');
  } catch {}

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  console.log(`[Gemini] Usando modelo: ${modelName}`);

  return genAI.getGenerativeModel({
    model: modelName,
    tools: tools,
    // Envia a systemInstruction como string para compatibilidade com modelos 2.0
    systemInstruction: systemInstruction,
    toolConfig: { // Adicionando toolConfig para guiar o uso de ferramentas
      functionCallingConfig: {
        mode: 'AUTO', // 'AUTO': O modelo decide quando chamar funções. 'ANY': Força chamada de função se possível. 'NONE': Desabilita.
      },
    },
  });
};

export const generateResponse = async (
  prompt,
  history = [],
  userId = null
) => {
  try {
    const model = await getGeminiModel(userId); // Model já configurado com systemInstruction e toolConfig
    // Reforça a persona também por requisição (alguns modelos respeitam melhor por-call)
    const systemInstruction = await getSystemInstruction(userId);

    const geminiHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));

    let currentContents = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: prompt }] }
    ];

    let safetyFallbackCount = 0;
    const MAX_FALLBACKS = 5; // Limite de interações LLM-ferramenta por turno do usuário

    while (safetyFallbackCount < MAX_FALLBACKS) {
      const result = await model.generateContent({ contents: currentContents, systemInstruction });
      const response = result.response;

      if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
        console.warn("Resposta inválida ou vazia do Gemini:", response);
        // Tenta extrair informações de promptFeedback se houver bloqueio de segurança
        if (response.promptFeedback && response.promptFeedback.blockReason) {
          return `Vagner está pensativo... Algo bloqueou a resposta: ${response.promptFeedback.blockReason}. Detalhes: ${JSON.stringify(response.promptFeedback.safetyRatings)}`;
        }
        return "Desculpe, Vagner não conseguiu processar sua solicitação no momento. Tente novamente.";
      }

      const candidateContent = response.candidates[0].content;
      // Adiciona a resposta do modelo (que pode ser texto ou functionCall) ao histórico da interação atual
      currentContents.push(candidateContent);

      const functionCallPart = candidateContent.parts.find(part => part.functionCall);

      if (functionCallPart && functionCallPart.functionCall) {
        const functionCall = functionCallPart.functionCall;
        let functionResponseData;
        let partForLLM; // Esta será a FunctionResponse Part para o LLM

        console.log(`LLM chamou função: ${functionCall.name} com args:`, functionCall.args);

        if (functionCall.name === 'getCurrentTime') {
          functionResponseData = getCurrentTime();
          partForLLM = { functionResponse: { name: 'getCurrentTime', response: functionResponseData } };
        } else if (functionCall.name === 'getWeather') {
          // getWeather agora depende de userCity estar preenchida.
          // A lógica de pedir cidade deve ser tratada pelo LLM chamando setUserCity primeiro.
          if (!userCity && functionCall.name === 'getWeather') {
            // Isso não deveria acontecer se o LLM seguir as instruções para chamar setUserCity primeiro
            console.warn("LLM tentou chamar getWeather sem userCity definida. O LLM deveria ter chamado setUserCity.");
            functionResponseData = { error: "CITY_NOT_SET_INTERNAL", message: "A cidade do usuário precisa ser definida com setUserCity antes de chamar getWeather." };
          } else {
            functionResponseData = await getWeather();
          }
          partForLLM = { functionResponse: { name: 'getWeather', response: functionResponseData } };
        } else if (functionCall.name === 'setUserCity') {
          const cityArg = functionCall.args.city;
          const setUserCityResult = handleSetUserCity(cityArg);

          if (setUserCityResult.action === "ASK_CITY") {
            // O sistema (código JS) pergunta a cidade, a resposta não volta para o LLM neste turno.
            return "Qual é a sua cidade?"; // Retorna diretamente para o usuário.
          }
          // Se não for ASK_CITY, é um resultado de sucesso ou erro para o LLM.
          functionResponseData = setUserCityResult;
          partForLLM = { functionResponse: { name: 'setUserCity', response: functionResponseData } };
        } else {
          console.error(`Função desconhecida chamada: ${functionCall.name}`);
          functionResponseData = { error: `Função '${functionCall.name}' não implementada.` };
          partForLLM = { functionResponse: { name: functionCall.name, response: functionResponseData } };
        }

        // Adiciona o resultado da função como uma nova mensagem 'tool' para o LLM processar no próximo loop
        currentContents.push({ role: 'tool', parts: [partForLLM] });
        // Continua o loop para o LLM processar o resultado da função

      } else {
        // Nenhuma chamada de função, o LLM forneceu uma resposta em texto.
        const textResponse = candidateContent.parts.map(part => part.text).join("").trim();
        console.log("LLM respondeu com texto:", textResponse);
        return textResponse; // Retorna a resposta final do LLM
      }
      safetyFallbackCount++;
    }

    console.warn("Máximo de chamadas de função atingido. Retornando última tentativa de texto ou erro.");
    const lastModelPart = currentContents.filter(c => c.role === 'model').pop();
    if (lastModelPart && lastModelPart.parts.every(p => p.text)) {
      return lastModelPart.parts.map(p => p.text).join("").trim();
    }
    return "Desculpe, Vagner está tendo dificuldades em processar seu pedido após várias etapas. Tente simplificar.";

  } catch (error) {
    console.error('Erro ao gerar resposta do Gemini:', error);
    // ... (seu tratamento de erro existente) ...
    if (error.response && error.response.data) {
      console.error('Detalhes do erro da API Gemini:', error.response.data);
    } else if (error.message) { // Gemini SDK pode lançar erros com `message`
      console.error('Detalhes do erro da API Gemini (message):', error.message);
    }

    if (error.message && error.message.includes('400 Bad Request') && error.message.includes("model parameter")) {
      return `Ops! Parece que o nome do modelo ('${model.modelH}') não é válido ou você não tem acesso a ele. Verifique o nome do modelo.`;
    }
    // ... (outros tratamentos de erro específicos) ...
    return "Ops! Parece que o Vagner (nosso chatbot) encontrou um campo de força magnética... digo, um erro. Tente novamente!";
  }
};
