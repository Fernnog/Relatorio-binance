const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    // A lógica de CORS foi removida daqui e agora é controlada pelo vercel.json

    if (req.method !== 'POST') {
        return res.status(405).json({ answer: 'Método não permitido. Use POST.' });
    }

    try {
        const { question, operationsData } = req.body;
        if (!question || !operationsData) {
            return res.status(400).json({ answer: 'Pergunta ou dados de operação não fornecidos.' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

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
        const responseText = result.response.text();
        
        try {
            const parsedJson = JSON.parse(responseText);
            res.status(200).json(parsedJson);
        } catch (parseError) {
            console.error("Erro de Parse JSON (Chat):", parseError, "Resposta Bruta:", responseText);
            res.status(500).json({
                answer: `Ocorreu um erro ao processar a resposta da IA. Resposta recebida: ${responseText}`
            });
        }
    } catch (error) {
        console.error("Erro na API Gemini (chat-with-trades):", error);
        res.status(500).json({ answer: "Desculpe, não consegui processar sua pergunta neste momento." });
    }
};
