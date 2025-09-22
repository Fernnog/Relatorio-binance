// Substitua TODO o conteúdo de 'assets/js/api-client.js' por este código corrigido.

/**
 * @file api-client.js
 * @description Módulo central para todas as comunicações com as APIs de back-end.
 */

// NOTA: A variável API_BASE_URL é definida em config.js e carregada no index.html

/**
 * Envia os dados de operações para a análise inicial da IA e retorna os insights.
 * @param {string} operationsCsv - A string contendo os dados de trade em formato CSV.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para um array de objetos de insight.
 */
async function getAIInsights(operationsCsv) {
  try {
    // --- INÍCIO DA CORREÇÃO ---
    // Remove uma possível barra no final da URL base para evitar a barra dupla.
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/analyze-trades`;
    // --- FIM DA CORREÇÃO ---

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operationsData: operationsCsv }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch(e) {
        errorData = { error: await response.text() };
      }
      throw new Error(errorData.error || `Erro na API de Análise: Status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Falha ao buscar insights da IA:', error);
    throw error;
  }
}

/**
 * Envia uma pergunta do usuário e o contexto dos trades para a funcionalidade de chat da IA.
 * @param {string} question - A pergunta feita pelo usuário.
 * @param {string} operationsCsv - A string contendo o contexto dos dados de trade em CSV.
 * @returns {Promise<Object>} Uma promessa que resolve para um objeto contendo a chave 'answer'.
 */
async function askAIChat(question, operationsCsv) {
  try {
    // --- INÍCIO DA CORREÇÃO ---
    // Remove uma possível barra no final da URL base para evitar a barra dupla.
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/chat-with-trades`;
    // --- FIM DA CORREÇÃO ---
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, operationsData: operationsCsv }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch(e) {
         errorData = { answer: await response.text() };
      }
      throw new Error(errorData.answer || `Erro na API de Chat: Status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Falha ao interagir com o chat da IA:', error);
    throw error;
  }
}
