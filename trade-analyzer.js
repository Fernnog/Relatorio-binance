// --- FUNÇÕES DE LÓGICA DE NEGÓCIO ---
// Este arquivo contém a lógica pura de análise de dados,
// sem manipulação direta do DOM.

/**
 * Soma uma propriedade de um array de objetos.
 * @param {Array<Object>} arr O array de fills.
 * @param {string} prop A propriedade a ser somada.
 * @returns {number} A soma total.
 */
function legSum(arr, prop) {
  return arr.reduce((sum, fill) => sum + Number(fill[prop] || 0), 0);
}

/**
 * Analisa uma lista de fills brutos, agrupa-os em operações completas.
 * @param {Array<Object>} fills Lista de todas as ordens executadas.
 * @param {number} capitalInicial O capital inicial para os cálculos.
 * @param {Object} exclusoes Objeto com filtros de símbolos e datas.
 * @returns {Object} O objeto de resumo da performance.
 */
function analisarOperacoes(fills, capitalInicial, exclusoes = {}) {
  // Filtro de exclusões e ordenação por data
  let filtered = fills.filter(fill => {
    // Validação básica da data para evitar erros na ordenação
    if (!fill.date || isNaN(new Date(fill.date).getTime())) return false;

    // Verifica exclusão por símbolo
    const symbolExcluded = (exclusoes.symbols || []).some(exc => fill.symbol.toLowerCase().includes(exc));
    if (symbolExcluded) return false;

    // Verifica exclusão por período de data
    if (exclusoes.dateRange && exclusoes.dateRange.start && exclusoes.dateRange.end) {
        const fillDate = fill.date;
        const startDate = new Date(exclusoes.dateRange.start);
        const endDate = new Date(exclusoes.dateRange.end);
        
        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);

        if (fillDate >= startDate && fillDate <= endDate) {
            return false; // Exclui a operação se estiver dentro do intervalo
        }
    }
    return true; // Mantém o fill se não houver exclusão
  }).sort((a, b) => a.date - b.date);

  const operacoes = [];
  const tradesBySymbol = {};
  filtered.forEach(f => {
    if (!tradesBySymbol[f.symbol]) tradesBySymbol[f.symbol] = [];
    tradesBySymbol[f.symbol].push(f);
  });

  for (const symbol in tradesBySymbol) {
    const symbolFills = tradesBySymbol[symbol];
    if (symbolFills.length < 2) continue;

    // ETAPA 1: Agrupar fills consecutivos do mesmo lado em "pernas" (legs).
    const allLegs = [];
    let currentLeg = [];
    symbolFills.forEach(fill => {
      if (currentLeg.length === 0 || fill.side === currentLeg[0].side) {
        currentLeg.push(fill);
      } else {
        allLegs.push(currentLeg);
        currentLeg = [fill];
      }
    });
    if (currentLeg.length > 0) allLegs.push(currentLeg);

    // --- INÍCIO DA NOVA LÓGICA DE PAREAMENTO ---
    // ETAPA 2: Iterar sobre as pernas para encontrar pares que formam uma operação.
    let legs = [...allLegs]; // Cria uma cópia mutável para consumir
    while (legs.length >= 2) {
        const entryLeg = legs[0];
        const exitLeg = legs[1];

        const qtyIn = legSum(entryLeg, 'qty');
        const qtyOut = legSum(exitLeg, 'qty');

        // Verifica se a primeira e a segunda perna são um par válido (lados opostos e quantidade igual)
        if (entryLeg[0].side !== exitLeg[0].side && Math.abs(qtyIn - qtyOut) < 1e-8) {
            const allFills = [...entryLeg, ...exitLeg];
            const [buys, sells] = entryLeg[0].side === 'BUY' ? [entryLeg, exitLeg] : [exitLeg, entryLeg];
            
            const totalRProfit = legSum(allFills, 'rprofit');
            const hasRProfitData = allFills.some(f => f.rprofit !== 0 && f.rprofit !== undefined);
    
            const resultadoCalculado = hasRProfitData
              ? totalRProfit
              : legSum(sells, "amount") - legSum(buys, "amount") - legSum(allFills, "fee");
    
            operacoes.push({
              symbol: symbol,
              entrada: buys,
              saida: sells,
              totalQty: qtyIn,
              fees: legSum(allFills, "fee"),
              resultado: resultadoCalculado,
            });

            // Se formou um par, remove as duas pernas da lista e continua o loop
            legs.splice(0, 2);
        } else {
            // Se não formou um par, a primeira perna está "aberta" ou órfã.
            // Removemos apenas ela e tentamos parear a próxima.
            legs.splice(0, 1);
        }
    }
    // --- FIM DA NOVA LÓGICA DE PAREAMENTO ---
  }

  operacoes.sort((a, b) => new Date(a.entrada[0].date) - new Date(b.entrada[0].date));

  return recalcularResumo(operacoes, capitalInicial);
}

/**
 * Calcula todas as métricas de performance com base em uma lista de operações já processadas.
 * @param {Array<Object>} operacoes Lista de operações completas.
 * @param {number} capitalInicial O capital inicial.
 * @returns {Object} Um objeto contendo todas as métricas calculadas.
 */
function recalcularResumo(operacoes, capitalInicial) {
    let ganhos = 0, perdas = 0, fees = 0, lucro = 0, win = 0, loss = 0, neutro = 0;
    const capitalEvolution = [{ date: 'Início', capital: capitalInicial }];
    let capitalAtual = capitalInicial;

    operacoes.forEach(op => {
        fees += op.fees;
        if (op.resultado > 0) { ganhos += op.resultado; win++; }
        else if (op.resultado < 0) { perdas += op.resultado; loss++; }
        else neutro++;
        lucro += op.resultado;
        capitalAtual += op.resultado;
        capitalEvolution.push({
            date: new Date(op.entrada[0].date).toLocaleDateString('pt-BR'),
            capital: capitalAtual
        });
    });
    
    let maxDrawdown = 0;
    let peakCapital = capitalInicial;
    capitalEvolution.forEach(point => {
        const currentCapital = point.capital;
        if (currentCapital > peakCapital) {
            peakCapital = currentCapital;
        }
        const drawdown = peakCapital > 0 ? (peakCapital - currentCapital) / peakCapital : 0;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    });

    const absPerdas = Math.abs(perdas);
    const lucroMedio = win > 0 ? (ganhos / win) : 0;
    const prejuizoMedio = loss > 0 ? (absPerdas / loss) : 0;
    const payoffRatio = prejuizoMedio > 0 ? (lucroMedio / prejuizoMedio) : 0;
    const fatorLucro = absPerdas > 0 ? (ganhos / absPerdas) : 0;

    return {
        total: operacoes.length, wins: win, losses: loss, neutros: neutro,
        taxaAcerto: operacoes.length ? ((win / operacoes.length) * 100).toFixed(2) : '0.00',
        ganhos: ganhos.toFixed(2), perdas: perdas.toFixed(2),
        fees: fees.toFixed(2), liquido: lucro.toFixed(2),
        retorno: operacoes.length && capitalInicial ? ((lucro / capitalInicial) * 100).toFixed(2) : '0.00',
        payoffRatio: payoffRatio.toFixed(2),
        fatorLucro: fatorLucro.toFixed(2),
        maxDrawdown: (maxDrawdown * 100).toFixed(2),
        operacoes, capitalEvolution
    };
}
