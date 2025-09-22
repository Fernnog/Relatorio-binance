/**
 * @file api/analyze-trades.js
 * @description Função Serverless (back-end) que atua como um proxy seguro para a API Gemini.
 * Recebe dados de trade, gera um prompt para análise de insights e retorna uma resposta estruturada.
 * ESSENCIAL para proteger a chave da API.
 */

// Importa o SDK oficial do Google Generative AI.
// Em um ambiente de produção (Vercel, Netlify, etc.), instale com `npm install @google/generative-ai`.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// A Chave de API NUNCA deve ser exposta no código.
// Carregue-a a partir de Variáveis de Ambiente seguras da sua plataforma de hospedagem.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Handler principal da função serverless.
 * @param {object} req - O objeto de requisição (padrão Node.js).
 * @param {object} res - O objeto de resposta (padrão Node.js).
 */
module.exports = async (req, res) => {
  // 1. Medida de Segurança: Aceitar apenas requisições POST.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // 2. Extrair dados da requisição.
    const { operationsData } = req.body;
    if (!operationsData) {
      return res.status(400).json({ error: 'Nenhum dado de operação fornecido.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 3. Construir o Prompt detalhado e robusto para a IA.
    const prompt = `
      Você é um coach de trading e analista de dados sênior. Sua tarefa é analisar os dados de operações de trade, que estão em formato CSV, e fornecer insights valiosos.
      Os campos do CSV são: symbol, startDate, result, fees, winLoss (1 para ganho, 0 para perda).

      Analise os dados e identifique até 3 padrões significativos, focando em:
      1.  **Performance Contextual:** O trader demonstra melhor desempenho com algum ativo específico? Em algum dia da semana?
      2.  **Padrões Comportamentais:** Existem sinais de vieses, como aversão à perda (perdas médias significativamente maiores que ganhos médios) ou excesso de operações após uma perda (revenge trading)?
      3.  **Gerenciamento de Risco e Custos:** O impacto das taxas é desproporcional em relação ao resultado dos trades?

      Sua resposta DEVE ser um array JSON válido. Cada objeto no array deve ter EXATAMENTE as seguintes três chaves: "title", "evidence" e "recommendation".
      - "title": Um título claro e conciso para o insight (ex: "Concentração de Lucros em BTCUSDT").
      - "evidence": Uma frase curta que descreve os dados que suportam o insight (ex: "Dos seus trades lucrativos, 75% ocorreram em BTCUSDT.").
      - "recommendation": Uma recomendação acionável e prática para o trader (ex: "Considere focar mais em sua estratégia para BTCUSDT ou analisar por que ela funciona melhor neste ativo.").

      Não inclua nenhuma outra explicação, texto introdutório ou formatação fora do array JSON.

      Dados para análise:
      ${operationsData}
    `;

    // 4. Chamar a API da IA e processar a resposta.
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Limpa a resposta da IA de possíveis formatações de markdown antes de fazer o parse.
    const jsonText = response.text().replace(/```json|```/g, '').trim();

    // 5. Enviar a resposta final para o front-end.
    res.status(200).json(JSON.parse(jsonText));

  } catch (error) {
    // 6. Tratamento de Erros robusto.
    console.error("Erro na chamada da API Gemini (analyze-trades):", error);
    res.status(500).json({ error: "Ocorreu um erro interno ao processar a análise da IA." });
  }
};
