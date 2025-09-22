/**
 * @file api/chat-with-trades.js
 * @description Função Serverless (back-end) para a funcionalidade de chat interativo.
 * Recebe uma pergunta do usuário e o contexto dos trades, formula um prompt para a IA e
 * retorna a resposta de forma estruturada.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Handler principal da função serverless de chat.
 * @param {object} req - O objeto de requisição.
 * @param {object} res - O objeto de resposta.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ answer: 'Método não permitido. Use POST.' });
  }

  try {
    const { question, operationsData } = req.body;

    if (!question || !operationsData) {
      return res.status(400).json({ answer: 'Pergunta ou dados de operação não fornecidos.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Prompt otimizado para uma sessão de perguntas e respostas.
    const prompt = `
      Você é um assistente de análise de dados de trading. Sua única função é responder à pergunta do usuário com base no contexto de dados fornecido.
      Seja direto, conciso e baseie sua resposta estritamente nos dados.

      **Contexto dos Dados (formato CSV):**
      ${operationsData}

      **Pergunta do Usuário:**
      "${question}"

      Sua resposta DEVE ser um objeto JSON válido com uma única chave: "answer".
      O valor de "answer" deve ser uma string contendo a resposta à pergunta.
      NÃO inclua explicações ou formatação markdown. Sua resposta deve começar com '{' e terminar com '}'.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    // --- INÍCIO DA MODIFICAÇÃO CRÍTICA DE ROBUSTEZ ---
    try {
      // Tentamos fazer o parse do texto que a IA retornou.
      const parsedJson = JSON.parse(rawText);
      // Se funcionar, enviamos a resposta de sucesso.
      res.status(200).json(parsedJson);
    } catch (parseError) {
      // Se o parse falhar, capturamos o erro aqui.
      console.error("Erro de Parse JSON na resposta da API Gemini (Chat):", parseError);
      console.error("--- Resposta Bruta da IA que causou o erro ---");
      console.error(rawText);
      console.error("--------------------------------------------");
      // Enviamos uma resposta de erro ESTRUTURADA para o front-end.
      res.status(500).json({
        answer: `Ocorreu um erro ao processar a resposta da IA. Resposta recebida: ${rawText}`
      });
    }
    // --- FIM DA MODIFICAÇÃO CRÍTICA ---
    
  } catch (error) {
    console.error("Erro na API Gemini (chat-with-trades):", error);
    res.status(500).json({ answer: "Desculpe, não consegui processar sua pergunta neste momento." });
  }
};
