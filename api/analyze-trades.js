const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    // A lógica de CORS foi removida daqui e agora é controlada pelo vercel.json

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    try {
        const { operationsData } = req.body;
        if (!operationsData) {
            return res.status(400).json({ error: 'Nenhum dado de operação fornecido.' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

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
        const responseText = result.response.text();

        try {
            const parsedJson = JSON.parse(responseText);
            res.status(200).json(parsedJson);
        } catch (parseError) {
            console.error("Erro de Parse JSON (analyze-trades):", parseError, "Resposta Bruta:", responseText);
            res.status(500).json({
                error: "A resposta da IA não estava em um formato JSON válido.",
                details: responseText
            });
        }
    } catch (error) {
        console.error("Erro geral na chamada da API Gemini (analyze-trades):", error);
        res.status(500).json({ error: "Ocorreu um erro interno ao processar a análise da IA." });
    }
};
