// Substitua TODO o conteúdo de 'api/analyze-trades.js' por este código atualizado.

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const allowedOrigin = 'https://fernnog.github.io';
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    try {
        const { operationsData } = req.body;
        if (!operationsData) {
            return res.status(400).json({ error: 'Nenhum dado de operação fornecido.' });
        }

        // --- INÍCIO DA CORREÇÃO ---
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        // --- FIM DA CORREÇÃO ---

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
          NÃO inclua nenhuma explicação, texto introdutório, ou formatação de markdown como \`\`\`json. Sua resposta deve começar com '[' e terminar com ']'.
          Dados para análise:
          ${operationsData}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text();

        try {
            const parsedJson = JSON.parse(rawText);
            res.status(200).json(parsedJson);
        } catch (parseError) {
            console.error("Erro de Parse JSON (analyze-trades):", parseError, "Resposta Bruta:", rawText);
            res.status(500).json({
                error: "A resposta da IA não estava em um formato JSON válido.",
                details: rawText
            });
        }
    } catch (error) {
        console.error("Erro geral na chamada da API Gemini (analyze-trades):", error);
        res.status(500).json({ error: "Ocorreu um erro interno ao processar a análise da IA." });
    }
};
