/**
 * @file api-client.js
 * @description Módulo central para todas as comunicações com as APIs de back-end.
 * Abstrai a lógica do 'fetch' para que o resto da aplicação possa fazer chamadas
 * de forma limpa e padronizada.
 */

/**
 * Envia os dados de operações para a análise inicial da IA e retorna os insights.
 * @param {string} operationsCsv - A string contendo os dados de trade em formato CSV.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para um array de objetos de insight.
 * @throws {Error} Lança um erro se a resposta da rede não for bem-sucedida.
 */
async function getAIInsights(operationsCsv) {
  try {
    const response = await fetch('/api/analyze-trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operationsData: operationsCsv }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro na API de Análise: Status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Falha ao buscar insights da IA:', error);
    // Propaga o erro para que a interface do usuário possa tratá-lo.
    throw error;
  }
}

/**
 * Envia uma pergunta do usuário e o contexto dos trades para a funcionalidade de chat da IA.
 * @param {string} question - A pergunta feita pelo usuário.
 * @param {string} operationsCsv - A string contendo o contexto dos dados de trade em CSV.
 * @returns {Promise<Object>} Uma promessa que resolve para um objeto contendo a chave 'answer'.
 * @throws {Error} Lança um erro se a resposta da rede não for bem-sucedida.
 */
async function askAIChat(question, operationsCsv) {
  try {
    const response = await fetch('/api/chat-with-trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, operationsData: operationsCsv }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.answer || `Erro na API de Chat: Status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Falha ao interagir com o chat da IA:', error);
    // Propaga o erro para ser tratado pela UI.
    throw error;
  }
}