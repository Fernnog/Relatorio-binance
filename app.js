let capitalChartInstance = null; // Para controlar a instância do gráfico

// --- 1. FUNÇÕES DE UTILIDADE ---
// Responsáveis por tarefas pequenas e reutilizáveis de formatação e cálculo.

// Identificação automática dos headers, considerando português e inglês
function mapColumns(headerRow) {
  const col = {};
  headerRow.forEach((h, i) => {
    const l = h.toString().trim().toLowerCase();
    // Datas
    if (!col.date && (l.includes('date') || l.includes('data'))) col.date = i;
    // Símbolo (par ou ativo)
    if (!col.symbol && (l.includes('symbol') || l.includes('símbolo') || l.includes('par') || l.includes('ativo'))) col.symbol = i;
    // Lado da operação (buy/sell)
    if (!col.side && (l.includes('side') || l.includes('operação') || l.includes('tipo') || l.includes('ação'))) col.side = i;
    // Preço
    if (!col.price && (l.includes('price') || l.includes('preço') || l.includes('valor unit') || l.includes('cotação'))) col.price = i;
    // Quantidade
    if (!col.qty && (l.includes('quant') || l.includes('qtd') || l.includes('quantity') || l.includes('quantidade'))) col.qty = i;
    // Taxa
    if (!col.fee && (l.includes('fee') || l.includes('taxa') || l.includes('comissão') || l.includes('commission'))) col.fee = i;
    // Valor total/Notional
    if (!col.amount && (l.includes('amount') || l.includes('valor total') || l.includes('notional') || l.includes('total'))) col.amount = i;
    // Lucro/Prejuízo realizado
    if (!col.rprofit && (l.includes('lucro') || l.includes('profit') || l.includes('pnl') || l.includes('realiz'))) col.rprofit = i;
    // Moeda da taxa (opcional)
    if (!col.fee_coin && (l.includes('fee coin') || l.includes('fee currency') || l.includes('moeda taxa'))) col.fee_coin = i;
  });
  return col;
}

// Transforma linha crua em objeto estruturado
function normalizeRow(row, columns) {
  function safeGet(idx) {
    return (row[idx] !== undefined && row[idx] !== null) ? row[idx] : '';
  }
  return {
    date: new Date(safeGet(columns.date)),
    symbol: (safeGet(columns.symbol) || '').toString().trim(),
    side: (safeGet(columns.side) || '').toString().trim().toUpperCase(),
    price: parseFloat((safeGet(columns.price) || "0").toString().replace(",", ".")),
    qty: parseFloat((safeGet(columns.qty) || "0").toString().replace(",", ".")),
    fee: parseFloat((safeGet(columns.fee) || "0").toString().replace(",", ".")),
    rprofit: parseFloat((columns.rprofit !== undefined ? safeGet(columns.rprofit) : "0").toString().replace(",", ".")),
    amount: parseFloat((columns.amount !== undefined ? safeGet(columns.amount) : "0").toString().replace(",", ".")),
    fee_coin: (columns.fee_coin !== undefined ? safeGet(columns.fee_coin) : ''),
    raw: row
  };
}

// Soma uma propriedade de um array de objetos
function legSum(arr, prop) {
  return arr.reduce((sum, fill) => sum + Number(fill[prop] || 0), 0);
}


// --- 2. LÓGICA DE NEGÓCIO (O ANALISADOR) ---
// Responsável pelo processamento e análise dos dados dos trades.

function analisarOperacoes(fills, capitalInicial, exclusoes = []) {
  // Filtro de exclusões e ordenação por data
  let filtered = fills.filter(fill =>
    !exclusoes.some(exc =>
      fill.symbol.toLowerCase().includes(exc.toLowerCase()) ||
      fill.date.toISOString().slice(0, 10).includes(exc)
    )
  ).sort((a, b) => a.date - b.date);

  // LÓGICA UNIFICADA E CORRIGIDA: Agrupamento de "pernas" é sempre a base.
  const operacoes = [];
  const tradesBySymbol = {};
  filtered.forEach(f => {
    if (!tradesBySymbol[f.symbol]) tradesBySymbol[f.symbol] = [];
    tradesBySymbol[f.symbol].push(f);
  });

  for (const symbol in tradesBySymbol) {
    const symbolFills = tradesBySymbol[symbol];
    if (symbolFills.length < 2) continue;

    // 1. Agrupar fills consecutivos do mesmo lado em "pernas" (legs)
    const legs = [];
    let currentLeg = [];
    symbolFills.forEach(fill => {
      if (currentLeg.length === 0 || fill.side === currentLeg[0].side) {
        currentLeg.push(fill);
      } else {
        legs.push(currentLeg);
        currentLeg = [fill];
      }
    });
    if (currentLeg.length > 0) legs.push(currentLeg);

    // 2. Tentar parear pernas consecutivas
    for (let i = 0; i < legs.length - 1; i++) {
      const entryLeg = legs[i];
      const exitLeg = legs[i + 1];
      const qtyIn = legSum(entryLeg, 'qty');
      const qtyOut = legSum(exitLeg, 'qty');

      if (Math.abs(qtyIn - qtyOut) < 1e-8) { // Quantidades correspondem?
        const allFills = [...entryLeg, ...exitLeg];
        const [buys, sells] = entryLeg[0].side === 'BUY' ? [entryLeg, exitLeg] : [exitLeg, entryLeg];
        
        // 3. CÁLCULO DE RESULTADO INTELIGENTE:
        // Prioriza a soma do 'Realized Profit' se disponível. Senão, calcula manualmente.
        const totalRProfit = legSum(allFills, 'rprofit');
        const hasRProfitData = allFills.some(f => f.rprofit !== 0);

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
        i++; // Pula a próxima perna, pois já foi usada no par
      }
    }
  }

  // LOGICA ADICIONADA: Ordenar operações por data de início para o gráfico
  operacoes.sort((a, b) => new Date(a.entrada[0].date) - new Date(b.entrada[0].date));

  // Resumo financeiro final
  let ganhos = 0, perdas = 0, fees = 0, lucro = 0, win = 0, loss = 0, neutro = 0;

  // LOGICA ADICIONADA: Preparar dados para o gráfico de evolução
  const capitalEvolution = [{
    date: 'Início',
    capital: capitalInicial
  }];
  let capitalAtual = capitalInicial;

  operacoes.forEach(op => {
    fees += op.fees;
    if (op.resultado > 0) { ganhos += op.resultado; win++; }
    else if (op.resultado < 0) { perdas += op.resultado; loss++; }
    else neutro++;
    lucro += op.resultado;
    
    // Adiciona ponto de dados ao gráfico
    capitalAtual += op.resultado;
    capitalEvolution.push({
      date: new Date(op.entrada[0].date).toLocaleDateString('pt-BR'),
      capital: capitalAtual
    });
  });

  return {
    total: operacoes.length, wins: win, losses: loss, neutros: neutro,
    taxaAcerto: operacoes.length ? ((win / operacoes.length) * 100).toFixed(2) : '0.00',
    ganhos: ganhos.toFixed(2), perdas: perdas.toFixed(2),
    fees: fees.toFixed(2), liquido: lucro.toFixed(2),
    retorno: operacoes.length && capitalInicial ? ((lucro / capitalInicial) * 100).toFixed(2) : '0.00',
    exclusoes, operacoes,
    capitalEvolution // Retorna os dados do gráfico
  };
}


// --- 3. RENDERIZAÇÃO E MANIPULAÇÃO DO DOM ---
// Funções que interagem diretamente com o HTML para exibir os resultados.

function renderReport(r) {
  const reportElement = document.getElementById('relatorio');
  reportElement.innerHTML = `
    <div id="report-summary-wrapper">
      <h2>RELATÓRIO DE PERFORMANCE DE TRADES</h2>
      <table class="report-table">
        <tr><th>Métrica</th><th>Valor</th></tr>
        <tr><td>Total de Operações Analisadas</td><td><b>${r.total}</b></td></tr>
        <tr><td>Operações com Lucro</td><td>${r.wins}</td></tr>
        <tr><td>Operações com Prejuízo</td><td>${r.losses}</td></tr>
        <tr><td>Operações Neutras</td><td>${r.neutros}</td></tr>
        <tr><td>Taxa de Acerto</td><td>${r.taxaAcerto}%</td></tr>
        <tr class="total-row"><td>Ganhos Totais</td><td>+${r.ganhos} USDT</td></tr>
        <tr class="loss-total-row"><td>Prejuízos Totais</td><td>${r.perdas} USDT</td></tr>
        <tr><td>Total de Taxas Pagas</td><td>${r.fees} USDT</td></tr>
        <tr class="result-row"><td>Resultado Líquido Final</td><td><b>${r.liquido} USDT</b></td></tr>
        <tr class="result-row"><td>Retorno sobre Capital Inicial</td><td><b>${r.retorno}%</b></td></tr>
      </table>
    </div>
    <div id="capital-chart-container"></div>
    <div id="operacoes-detalhadas"></div>
    <button id="share-btn">Compartilhar como imagem</button>
  `;

  renderCapitalChart(r.capitalEvolution); // Chama a função do gráfico
  renderOperacoesDetalhadas(r.operacoes);
  document.getElementById('reset-btn').style.display = 'inline-block';

  // Compartilhar como imagem
  const shareButton = document.getElementById('share-btn');
  shareButton.onclick = function() {
    // Alvo da captura de tela foi alterado para o novo wrapper
    const summaryElement = document.getElementById('report-summary-wrapper');
    shareButton.style.display = 'none'; // Oculta o botão
    html2canvas(summaryElement).then(function(canvas) {
      shareButton.style.display = 'block'; // Reexibe o botão
      let img = canvas.toDataURL('image/png');
      let w = window.open('');
      w.document.write('<img src="' + img + '" style="max-width:100%;">');
    });
  }
}

function renderCapitalChart(evolutionData) {
    if (capitalChartInstance) {
        capitalChartInstance.destroy(); // Destrói gráfico antigo se existir
    }
    const container = document.getElementById('capital-chart-container');
    container.innerHTML = '<h3>Evolução do Capital</h3><canvas id="capital-chart"></canvas>';
    
    const ctx = document.getElementById('capital-chart').getContext('2d');
    const labels = evolutionData.map(d => d.date);
    const data = evolutionData.map(d => d.capital.toFixed(2));

    capitalChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Capital (USDT)',
                data: data,
                borderColor: '#1746a0',
                backgroundColor: '#1746a020',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { callback: value => '$' + value } } }
        }
    });
}

function renderOperacoesDetalhadas(operacoes) {
    const container = document.getElementById('operacoes-detalhadas');
    if (!operacoes || operacoes.length === 0) {
        container.innerHTML = '';
        return;
    }

    const tableRows = operacoes.map(op => {
        const resultadoClass = op.resultado > 0 ? 'win-row' : (op.resultado < 0 ? 'loss-row' : '');
        const dataInicio = new Date(op.entrada[0].date).toLocaleString('pt-BR');
        return `
            <tr class="${resultadoClass}">
                <td>${op.symbol}</td>
                <td>${dataInicio}</td>
                <td>${op.resultado.toFixed(2)} USDT</td>
                <td>${op.fees.toFixed(2)} USDT</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <h3 class="detalhes-title">Detalhamento das Operações</h3>
        <table class="report-table details-table">
            <thead>
                <tr>
                    <th>Símbolo</th>
                    <th>Data Início</th>
                    <th>Resultado</th>
                    <th>Taxas</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}


// --- 4. PONTO DE ENTRADA E CONTROLE DE EVENTOS ---
// O código que "cola" tudo, escutando eventos do usuário e orquestrando as chamadas.

document.getElementById("trade-form").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const loading = document.getElementById("loading");
  const relatorioDiv = document.getElementById("relatorio");
  const erroDiv = document.getElementById("erro");

  relatorioDiv.innerHTML = '';
  erroDiv.style.display = 'none';
  loading.style.display = 'block';

  const fileInput = document.getElementById("trade-file");
  const capital = Number(document.getElementById("capital-inicial").value);
  const exclusoes = (document.getElementById("exclusoes").value || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!fileInput.files.length) {
      loading.style.display = 'none';
      return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(evt) {
    try {
      let workbook;
      if (file.name.endsWith('.csv')) {
        workbook = XLSX.read(evt.target.result, { type: 'binary' });
      } else {
        workbook = XLSX.read(evt.target.result, { type: 'array' });
      }
      const firstSheet = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, defval: "" });
      const header = data[0];
      const columns = mapColumns(header);
      
      if (columns.date === undefined || columns.symbol === undefined || columns.side === undefined) {
        throw "Colunas essenciais não encontradas (Data, Símbolo, Operação). Cabeçalho encontrado: " + header.join(', ');
      }
      
      const fills = data.slice(1).filter(row => row.length > 0 && row[columns.date]).map(row => normalizeRow(row, columns));
      const resumo = analisarOperacoes(fills, capital, exclusoes);
      renderReport(resumo);
    } catch (err) {
      erroDiv.innerHTML = "Erro ao analisar arquivo: <br>" + err;
      erroDiv.style.display = 'block';
    } finally {
      loading.style.display = 'none'; // Garante que o loading suma, mesmo com erro
    }
  };

  reader.onerror = function() {
      erroDiv.innerHTML = "Erro ao ler o arquivo.";
      erroDiv.style.display = 'block';
      loading.style.display = 'none';
  };

  if (file.name.endsWith('.csv')) {
    reader.readAsBinaryString(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
});


// --- 5. FUNCIONALIDADE DE REINÍCIO ---
document.getElementById("reset-btn").addEventListener("click", function() {
    if (confirm("Tem certeza que deseja limpar o relatório e começar uma nova análise?")) {
        // Limpa o formulário
        document.getElementById("trade-form").reset();

        // Limpa as divs de resultado e erro
        document.getElementById("relatorio").innerHTML = '';
        const erroDiv = document.getElementById("erro");
        erroDiv.innerHTML = '';
        erroDiv.style.display = 'none';
        
        // Destrói a instância do gráfico para liberar memória
        if (capitalChartInstance) {
            capitalChartInstance.destroy();
            capitalChartInstance = null;
        }

        // Esconde o próprio botão de reiniciar
        this.style.display = 'none';
    }
});