let capitalChartInstance = null; // Para controlar a instância do gráfico
let weeklyChartInstance = null;  // Para controlar a instância do gráfico semanal
let fullReportData = null;       // Para armazenar o resultado completo da análise
let datePicker = null;           // Para a instância do calendário
let analysisResult = null;       // Para guardar o resultado da análise para a validação

// --- 1. FUNÇÕES DE UTILIDADE ---
// Responsáveis por tarefas pequenas e reutilizáveis de formatação.

function mapColumns(headerRow) {
  const col = {};
  headerRow.forEach((h, i) => {
    const l = h.toString().trim().toLowerCase();
    if (!col.date && (l.includes('date') || l.includes('data'))) col.date = i;
    if (!col.symbol && (l.includes('symbol') || l.includes('símbolo') || l.includes('par') || l.includes('ativo'))) col.symbol = i;
    if (!col.side && (l.includes('side') || l.includes('operação') || l.includes('tipo') || l.includes('ação'))) col.side = i;
    if (!col.price && (l.includes('price') || l.includes('preço') || l.includes('valor unit') || l.includes('cotação'))) col.price = i;
    if (!col.qty && (l.includes('quant') || l.includes('qtd') || l.includes('quantity') || l.includes('quantidade'))) col.qty = i;
    if (!col.fee && (l.includes('fee') || l.includes('taxa') || l.includes('comissão') || l.includes('commission'))) col.fee = i;
    if (!col.amount && (l.includes('amount') || l.includes('valor total') || l.includes('notional') || l.includes('total'))) col.amount = i;
    if (!col.rprofit && (l.includes('lucro') || l.includes('profit') || l.includes('pnl') || l.includes('realiz'))) col.rprofit = i;
    if (!col.fee_coin && (l.includes('fee coin') || l.includes('fee currency') || l.includes('moeda taxa'))) col.fee_coin = i;
  });
  return col;
}

function normalizeRow(row, columns) {
  function safeGet(idx) {
    return (row[idx] !== undefined && row[idx] !== null) ? row[idx] : '';
  }
  const uniqueId = row.join('|') + Math.random(); // Add random to ensure uniqueness

  return {
    id: uniqueId,
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


// --- 2. RENDERIZAÇÃO E MANIPULAÇÃO DO DOM ---

function renderLayoutAndControls(reportData) {
    const reportElement = document.getElementById('relatorio');
    reportElement.innerHTML = `
        <div class="report-controls" id="report-controls"></div>
        <div id="report-content"></div>
    `;
    renderReportControls(fullReportData.operacoes);
    updateReportView(reportData);
}

function renderReportControls(operacoes) {
    const controlsContainer = document.getElementById('report-controls');
    const uniqueSymbols = ['-- TODOS OS ATIVOS --', ...new Set(operacoes.map(op => op.symbol))];

    controlsContainer.innerHTML = `
        <label for="symbol-filter">Filtrar por Ativo:</label>
        <select id="symbol-filter">
            ${uniqueSymbols.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
    `;

    document.getElementById('symbol-filter').addEventListener('change', function(e) {
        const selectedSymbol = e.target.value;
        const originalOps = fullReportData.operacoes;
        
        const filteredOps = (selectedSymbol === '-- TODOS OS ATIVOS --')
            ? originalOps
            : originalOps.filter(op => op.symbol === selectedSymbol);

        const capitalInicial = Number(document.getElementById("capital-inicial").value);
        const newSummary = recalcularResumo(filteredOps, capitalInicial);
        updateReportView(newSummary);
    });
}

function updateReportView(r) {
  const contentElement = document.getElementById('report-content');
  contentElement.innerHTML = `
    <div id="report-summary-wrapper">
      <h2>RELATÓRIO DE PERFORMANCE DE TRADES</h2>
      <table class="report-table">
        <tr><th>Métrica</th><th>Valor</th></tr>
        <tr><td>Total de Operações Analisadas</td><td><b>${r.total}</b></td></tr>
        <tr><td>Operações com Lucro</td><td>${r.wins}</td></tr>
        <tr><td>Operações com Prejuízo</td><td>${r.losses}</td></tr>
        <tr><td>Operações Neutras</td><td>${r.neutros}</td></tr>
        <tr><td>Taxa de Acerto</td><td>${r.taxaAcerto}%</td></tr>
        
        <tr class="total-row">
            <td>
                Ganhos Brutos (antes das taxas)
                <span class="info-icon">i
                    <span class="tooltip">Soma de todas as operações com resultado positivo, sem descontar as taxas.</span>
                </span>
            </td>
            <td>+${r.ganhosBrutos} USDT</td>
          </tr>
          <tr class="loss-total-row">
            <td>
                Prejuízos Brutos (antes das taxas)
                <span class="info-icon">i
                    <span class="tooltip">Soma de todas as operações com resultado negativo, sem descontar as taxas.</span>
                </span>
            </td>
            <td>${r.perdasBrutas} USDT</td>
          </tr>
        <tr><td>Total de Taxas Pagas</td><td>${r.fees} USDT</td></tr>
        
        <tr class="${r.liquido > 0 ? 'positive-result' : r.liquido < 0 ? 'negative-result' : 'result-row'}">
            <td>
                Resultado Líquido Final
                <span class="info-icon">i
                    <span class="tooltip">Resultado final após somar todos os ganhos e perdas e subtrair todas as taxas. (Ganhos Brutos + Prejuízos Brutos - Taxas)</span>
                </span>
            </td>
            <td><b>${r.liquido} USDT</b></td>
        </tr>
        <tr class="${r.retorno > 0 ? 'positive-result' : r.retorno < 0 ? 'negative-result' : 'result-row'}"><td>Retorno sobre Capital Inicial</td><td><b>${r.retorno}%</b></td></tr>

        <tr class="metric-row">
            <td>
                Payoff Ratio (Ganho Médio / Perda Média)
                <span class="info-icon">i
                    <span class="tooltip">Mede o tamanho do seu ganho médio em relação à sua perda média. Um valor acima de 1.0 significa que seus trades vencedores são, em média, maiores que seus perdedores.</span>
                </span>
            </td>
            <td><b>${r.payoffRatio}</b></td>
        </tr>
        <tr class="metric-row">
            <td>
                Fator de Lucro (Ganhos Totais / Perdas Totais)
                <span class="info-icon">i
                    <span class="tooltip">Mede o lucro bruto total dividido pelo prejuízo bruto total. Um valor acima de 2.0 é considerado excelente, indicando uma estratégia robusta.</span>
                </span>
            </td>
            <td><b>${r.fatorLucro}</b></td>
        </tr>
        <tr class="metric-row">
            <td>
                Drawdown Máximo
                <span class="info-icon">i
                    <span class="tooltip">A maior queda percentual do capital a partir de um pico. Mede o risco e a volatilidade da estratégia durante o período analisado.</span>
                </span>
            </td>
            <td><b>${r.maxDrawdown}%</b></td>
        </tr>
      </table>
    </div>
    <div id="weekly-dashboard-container"></div>
    <div id="capital-chart-container"></div>
    <div id="operacoes-detalhadas"></div>
  `;

    // --- LÓGICA DE BOTÕES DE AÇÃO ---
    const actionsContainer = document.getElementById('global-actions-container');
    const resetButton = document.getElementById('reset-btn');
    actionsContainer.innerHTML = ''; // Limpa botões antigos (exceto o de reset que será readicionado)
    actionsContainer.appendChild(resetButton);

    const shareButton = document.createElement('button');
    shareButton.id = 'share-btn';
    shareButton.textContent = 'Compartilhar Resumo (Imagem)';
    
    const exportMdButton = document.createElement('button');
    exportMdButton.id = 'export-md-btn';
    exportMdButton.textContent = 'Exportar p/ Prompt (MD)';

    actionsContainer.appendChild(shareButton);
    actionsContainer.appendChild(exportMdButton);

    actionsContainer.style.display = 'flex';
    resetButton.style.display = 'inline-block';
    
    // --- FIM DA LÓGICA DE BOTÕES ---

  renderCapitalChart(r.capitalEvolution);
  renderWeeklyDashboard(r.dailyBreakdown, r.calendarData, r.operacoes);
  renderOperacoesDetalhadas(r.operacoes);
  
  shareButton.onclick = function() {
    const summaryElement = document.getElementById('report-summary-wrapper');
    shareButton.style.display = 'none';
    exportMdButton.style.display = 'none'; // Esconde o botão de exportar também
    html2canvas(summaryElement).then(function(canvas) {
      shareButton.style.display = 'block';
      exportMdButton.style.display = 'block'; // Mostra novamente
      let img = canvas.toDataURL('image/png');
      let w = window.open('');
      w.document.write('<img src="' + img + '" style="max-width:100%;">');
    });
  }

  const chartContainer = document.getElementById('capital-chart-container');
  chartContainer.insertAdjacentHTML('beforeend', '<button id="share-chart-btn">Compartilhar Gráfico</button>');

  const shareChartButton = document.getElementById('share-chart-btn');
  shareChartButton.onclick = function() {
      shareChartButton.style.display = 'none'; 
      html2canvas(chartContainer).then(function(canvas) {
          shareChartButton.style.display = 'block'; 
          let img = canvas.toDataURL('image/png');
          let w = window.open('');
          w.document.write('<img src="' + img + '" style="max-width:100%;">');
      });
  }

  exportMdButton.addEventListener('click', function() {
    if (!fullReportData || !fullReportData.operacoes) {
        alert('Não há dados de operações para exportar.');
        return;
    }

    const capitalInicial = Number(document.getElementById("capital-inicial").value);
    const capitalFinal = fullReportData.capitalEvolution[fullReportData.capitalEvolution.length - 1].capital;

    let mdContent = `# 📊 Análise de Performance de Trades\n\n`;
    mdContent += `## 📝 Resumo Geral da Performance\n\n`;
    mdContent += `| Métrica | Valor |\n`;
    mdContent += `|---|---|\n`;
    mdContent += `| Capital Inicial | ${capitalInicial.toFixed(2)} USDT |\n`;
    mdContent += `| Capital Final | ${capitalFinal.toFixed(2)} USDT |\n`;
    mdContent += `| **Resultado Líquido Final** | **${r.liquido} USDT** |\n`;
    mdContent += `| Retorno sobre Capital | ${r.retorno}% |\n`;
    mdContent += `| Total de Operações | ${r.total} |\n`;
    mdContent += `| 📈 Operações Vencedoras | ${r.wins} |\n`;
    mdContent += `| 📉 Operações Perdedoras | ${r.losses} |\n`;
    mdContent += `| ➖ Operações Neutras | ${r.neutros} |\n`;
    mdContent += `| Taxa de Acerto | ${r.taxaAcerto}% |\n`;
    mdContent += `| Fator de Lucro | ${r.fatorLucro} |\n`;
    mdContent += `| Payoff Ratio | ${r.payoffRatio} |\n`;
    mdContent += `| Drawdown Máximo | ${r.maxDrawdown}% |\n`;
    mdContent += `| Total de Taxas | ${r.fees} USDT |\n\n`;

    // --- INÍCIO DA SEÇÃO DE MÉTRICAS AVANÇADAS ---
    mdContent += `\n## 🔬 Análise de Métricas Avançadas\n\n`;

    const rAdv = r.advancedMetrics; // Acessa as métricas avançadas

    // Helper para formatar a duração de forma mais legível
    const formatDuration = (minutes) => {
        if (!minutes || minutes === 0) return 'N/A';
        if (minutes < 1) return `${(minutes * 60).toFixed(0)} seg`;
        if (minutes < 60) return `${minutes.toFixed(1)} min`;
        const hours = Math.floor(minutes / 60);
        const remMinutes = Math.round(minutes % 60);
        return `${hours}h ${remMinutes}m`;
    };

    mdContent += `### ⏱️ Análise de Duração da Operação\n`;
    mdContent += `*Revela se há um viés para segurar operações perdedoras por mais tempo que as vencedoras.*\n\n`;
    mdContent += `| Métrica | Valor |\n`;
    mdContent += `|---|---|\n`;
    mdContent += `| Duração Média (Ganhos) | ${formatDuration(rAdv.duracaoMediaGanhos)} |\n`;
    mdContent += `| Duração Média (Perdas) | ${formatDuration(rAdv.duracaoMediaPerdas)} |\n\n`;

    mdContent += `### 📆 Análise de Performance Temporal\n`;
    mdContent += `*Mostra se a performance varia com dias ou horários específicos.*\n\n`;
    
    if (Object.keys(rAdv.resultadoPorDia).length > 0) {
        mdContent += `**Resultado por Dia da Semana**\n`;
        mdContent += `| Dia | Resultado Líquido (USDT) |\n`;
        mdContent += `|---|---:|\n`;
        Object.entries(rAdv.resultadoPorDia)
              .sort((a,b) => b[1] - a[1]) // Ordena do mais lucrativo para o menos
              .forEach(([dia, resultado]) => {
          mdContent += `| ${dia} | **${resultado.toFixed(2)}** |\n`;
        });
        mdContent += `\n`;
    }
    
    if (Object.keys(rAdv.resultadoPorHora).length > 0) {
        mdContent += `**Resultado por Hora do Dia (Início da Operação)**\n`;
        mdContent += `| Hora | Resultado Líquido (USDT) |\n`;
        mdContent += `|---|---:|\n`;
        Object.entries(rAdv.resultadoPorHora)
              .sort((a,b) => b[1] - a[1]) // Ordena do mais lucrativo para o menos
              .forEach(([hora, resultado]) => {
          const horaStr = hora.toString().padStart(2, '0');
          mdContent += `| ${horaStr}:00 - ${horaStr}:59 | **${resultado.toFixed(2)}** |\n`;
        });
        mdContent += `\n`;
    }

    mdContent += `### ⚖️ Análise de Risco e Custo\n`;
    mdContent += `*Padroniza os resultados e quantifica o impacto real dos custos.*\n\n`;
    mdContent += `| Métrica | Valor |\n`;
    mdContent += `|---|---|\n`;
    mdContent += `| R-Multiple Médio (Ganhos) | ${rAdv.rMultipleMedioGanhos.toFixed(2)}R |\n`;
    mdContent += `| R-Multiple Médio (Perdas) | ${rAdv.rMultipleMedioPerdas.toFixed(2)}R |\n`;
    mdContent += `| Impacto Percentual Médio das Taxas | ${rAdv.impactoMedioTaxas.toFixed(2)}% do Lucro Bruto |\n\n`;
    // --- FIM DA SEÇÃO DE MÉTRICAS AVANÇADAS ---

    mdContent += `## 📋 Detalhamento de Todas as Operações\n\n`;
    mdContent += `| # | 🏷️ Símbolo | ➡️ Data Entrada | ⬅️ Data Saída | 💰 Resultado (USDT) | 💸 Taxas (USDT) | Qtd. Total | Nº Compras | Nº Vendas |\n`;
    mdContent += `|---|---|---|---|---:|---:|---:|---:|---:|\n`;
    
    fullReportData.operacoes.forEach((op, index) => {
        const startDate = new Date(op.entrada[0].date).toLocaleString('pt-BR');
        const endDate = new Date(op.saida[op.saida.length - 1].date).toLocaleString('pt-BR');
        const resultEmoji = op.resultado > 0 ? '✅' : op.resultado < 0 ? '❌' : '➖';
        mdContent += `| ${index + 1} | ${op.symbol} | ${startDate} | ${endDate} | ${op.resultado.toFixed(2)} ${resultEmoji} | ${op.fees.toFixed(2)} | ${op.totalQty.toFixed(8)} | ${op.entrada.length} | ${op.saida.length} |\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement("a");
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "analise_trades.md");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  });
}

function renderCapitalChart(evolutionData) {
    if (capitalChartInstance) {
        capitalChartInstance.destroy();
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

function renderWeeklyDashboard(dailyBreakdown, calendarData, operacoes) {
    const container = document.getElementById('weekly-dashboard-container');
    if (!operacoes || operacoes.length === 0 || !dailyBreakdown) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = `
        <h2>📊 Análise Semanal</h2>
        <div class="weekly-analytics-wrapper">
            <div class="chart-container">
                <h3>Resultado por Dia da Semana</h3>
                <canvas id="weekly-chart"></canvas>
            </div>
            <div class="heatmap-container">
                <h3>Calendário de Performance</h3>
                <div id="heatmap-target"></div>
            </div>
        </div>
    `;

    // --- Renderiza Gráfico de Barras ---
    if (weeklyChartInstance) {
        weeklyChartInstance.destroy();
    }
    const diasDaSemanaNomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const ctx = document.getElementById('weekly-chart').getContext('2d');
    weeklyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dailyBreakdown.map(d => d.dia.substring(0, 3)),
            datasets: [{
                label: 'Resultado Líquido (USDT)',
                data: dailyBreakdown.map(d => d.resultado.toFixed(2)),
                backgroundColor: dailyBreakdown.map(d => d.resultado >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                borderColor: dailyBreakdown.map(d => d.resultado >= 0 ? '#16a34a' : '#dc2626'),
                borderWidth: 1
            }]
        },
        options: {
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dayData = dailyBreakdown[context.dataIndex];
                            return `Resultado: ${dayData.resultado.toFixed(2)} USDT | Trades: ${dayData.count}`;
                        }
                    }
                }
            },
            scales: { y: { beginAtZero: true } }
        }
    });

    // --- Renderiza Heatmap ---
    const heatmapTarget = document.getElementById('heatmap-target');
    const results = Object.values(calendarData).map(d => d.resultado);
    const maxAbsResult = Math.max(...results.map(Math.abs));

    const getColorClass = (result) => {
        if (result === 0) return 'heatmap-neutral';
        const intensity = Math.min(Math.ceil((Math.abs(result) / maxAbsResult) * 5), 5) || 1;
        return result > 0 ? `heatmap-win-${intensity}` : `heatmap-loss-${intensity}`;
    };
    
    const firstDate = new Date(operacoes[0].entrada[0].date);
    const lastDate = new Date(operacoes[operacoes.length - 1].saida.slice(-1)[0].date);

    let html = '<table class="heatmap-table"><thead><tr><th>Dom</th><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th></tr></thead><tbody>';
    let currentDate = new Date(firstDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // Inicia no domingo da primeira semana

    while (currentDate <= lastDate) {
        html += '<tr>';
        for (let i = 0; i < 7; i++) {
            const dateKey = currentDate.toISOString().split('T')[0];
            const data = calendarData[dateKey];
            if (currentDate >= firstDate && currentDate <= lastDate) {
                const day = currentDate.getDate();
                if (data) {
                    const colorClass = getColorClass(data.resultado);
                    const tooltip = `Data: ${currentDate.toLocaleDateString('pt-BR')}\nResultado: ${data.resultado.toFixed(2)} USDT\n${data.wins}W / ${data.losses}L`;
                    html += `<td class="heatmap-cell ${colorClass}" title="${tooltip}">${day}</td>`;
                } else {
                    html += `<td class="heatmap-cell heatmap-neutral" title="Sem operações">${day}</td>`;
                }
            } else {
                html += '<td class="empty"></td>';
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    heatmapTarget.innerHTML = html;

    // --- LÓGICA DE INTERATIVIDADE ---
    const detailsTitle = document.querySelector('#details-header .detalhes-title');
    const resetFilterBtn = document.getElementById('reset-details-filter-btn');

    // --- Interatividade do Gráfico de Barras ---
    weeklyChartInstance.options.onClick = (e, elements) => {
        if (!elements.length) return;
        const index = elements[0].index;
        const dayOfWeekClicked = index;
        const dayName = diasDaSemanaNomes[dayOfWeekClicked];
        
        const filteredOps = fullReportData.operacoes.filter(op => {
            return new Date(op.entrada[0].date).getDay() === dayOfWeekClicked;
        });
        
        detailsTitle.textContent = `Operações de: Todas as ${dayName}s`;
        resetFilterBtn.style.display = 'inline-block';
        renderOperacoesDetalhadas(filteredOps);
    };
    weeklyChartInstance.update();

    // --- Interatividade do Heatmap ---
    heatmapTarget.addEventListener('click', (e) => {
        const cell = e.target.closest('.heatmap-cell');
        if (!cell || !cell.title || cell.title.includes('Sem operações')) return;

        const dateMatch = cell.title.match(/Data: (\d{2}\/\d{2}\/\d{4})/);
        if (!dateMatch) return;
        
        const [day, month, year] = dateMatch[1].split('/');
        const clickedDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        const filteredOps = fullReportData.operacoes.filter(op => {
            return new Date(op.entrada[0].date).toISOString().split('T')[0] === clickedDateStr;
        });

        detailsTitle.textContent = `Operações de: ${dateMatch[1]}`;
        resetFilterBtn.style.display = 'inline-block';
        renderOperacoesDetalhadas(filteredOps);
    });
}

function renderOperacoesDetalhadas(operacoes) {
    const container = document.getElementById('operacoes-detalhadas');
    if (!operacoes || operacoes.length === 0) {
        container.innerHTML = '';
        return;
    }

    let currentSort = { key: 'date', direction: 'asc' };

    const renderRows = (ops) => {
        return ops.map(op => {
            const isWin = op.resultado > 0;
            const isLoss = op.resultado < 0;
            const resultadoClass = isWin ? 'win-row' : (isLoss ? 'loss-row' : '');
            const resultadoCellClass = isWin ? 'positive-cell' : (isLoss ? 'negative-cell' : '');
            const dataInicio = new Date(op.entrada[0].date).toLocaleString('pt-BR');
            return `
                <tr class="${resultadoClass}">
                    <td>${op.symbol}</td>
                    <td>${dataInicio}</td>
                    <td class="${resultadoCellClass}">${op.resultado.toFixed(2)} USDT</td>
                    <td>${op.fees.toFixed(2)} USDT</td>
                </tr>
            `;
        }).join('');
    };

    const sortAndRender = (key) => {
        const direction = (currentSort.key === key && currentSort.direction === 'asc') ? 'desc' : 'asc';
        currentSort = { key, direction };
        
        operacoes.sort((a, b) => {
            let valA, valB;
            if (key === 'date') {
                valA = new Date(a.entrada[0].date);
                valB = new Date(b.entrada[0].date);
            } else {
                valA = a[key];
                valB = b[key];
            }
            
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        document.querySelector('.details-table tbody').innerHTML = renderRows(operacoes);
        document.querySelectorAll('.sortable-header').forEach(th => th.classList.remove('asc', 'desc'));
        document.querySelector(`th[data-sort="${key}"]`).classList.add(direction);
    };
    
    container.innerHTML = `
        <div id="details-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1em;">
            <h3 class="detalhes-title" style="margin: 0; border: none; padding: 0;">Detalhamento das Operações</h3>
            <button id="reset-details-filter-btn" style="display: none;">Limpar Filtro e Mostrar Tudo</button>
        </div>
        <table class="report-table details-table">
            <thead>
                <tr>
                    <th class="sortable-header" data-sort="symbol">Símbolo</th>
                    <th class="sortable-header asc" data-sort="date">Data Início</th>
                    <th class="sortable-header" data-sort="resultado">Resultado</th>
                    <th class="sortable-header" data-sort="fees">Taxas</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;
    
    sortAndRender('date'); 

    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => sortAndRender(header.dataset.sort));
    });

    const resetButton = document.getElementById('reset-details-filter-btn');
    resetButton.addEventListener('click', () => {
        document.querySelector('#details-header .detalhes-title').textContent = 'Detalhamento das Operações';
        resetButton.style.display = 'none';
        renderOperacoesDetalhadas(fullReportData.operacoes);
    });
}


// --- 3. PONTO DE ENTRADA E CONTROLE DE EVENTOS ---

document.getElementById("trade-form").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const loading = document.getElementById("loading");
  const relatorioDiv = document.getElementById("relatorio");
  const erroDiv = document.getElementById("erro");
  const validacaoDiv = document.getElementById("validacao-operacoes");
  const submitButton = document.querySelector("#trade-form button[type='submit']");
  
  submitButton.disabled = true;
  submitButton.classList.add('button--loading');

  relatorioDiv.style.display = 'none';
  validacaoDiv.style.display = 'none';
  erroDiv.style.display = 'none';
  loading.style.display = 'block';

  const fileInput = document.getElementById("trade-file");
  const capital = Number(document.getElementById("capital-inicial").value);
  const symbolExclusions = (document.getElementById("exclusoes-symbols").value || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  
  const startDateObj = datePicker.getStartDate();
  const endDateObj = datePicker.getEndDate();
  
  const startDate = startDateObj ? startDateObj.dateInstance : null;
  const endDate = endDateObj ? endDateObj.dateInstance : null;
  
  const dateRange = (startDate && endDate) ? { start: startDate, end: endDate } : null;

  const exclusoes = { symbols: symbolExclusions, dateRange: dateRange };

  if (!fileInput.files.length) {
      loading.style.display = 'none';
      submitButton.disabled = false;
      submitButton.classList.remove('button--loading');
      return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();

  let workbook; 

  reader.onload = function(evt) {
    try {
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
      
      analysisResult = analisarOperacoes(fills, capital, exclusoes);
      
      renderValidationStep(analysisResult, workbook);

      validacaoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
    } catch (err) {
      erroDiv.innerHTML = "Erro ao analisar arquivo: <br>" + err;
      erroDiv.style.display = 'block';
    } finally {
      loading.style.display = 'none';
      submitButton.disabled = false;
      submitButton.classList.remove('button--loading');
    }
  };

  reader.onerror = function() {
      erroDiv.innerHTML = "Erro ao ler o arquivo.";
      erroDiv.style.display = 'block';
      loading.style.display = 'none';
      submitButton.disabled = false;
      submitButton.classList.remove('button--loading');
  };

  if (file.name.endsWith('.csv')) {
    reader.readAsBinaryString(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
});

// --- 4. FUNÇÃO DE VALIDAÇÃO INTERATIVA (VERSÃO FINAL COM MELHORIAS) ---
function renderValidationStep(result, workbook) {
    const container = document.getElementById('validation-table-container');
    const validationDiv = document.getElementById('validacao-operacoes');
    const relatorioDiv = document.getElementById('relatorio');
    
    const createBtn = document.getElementById('create-group-btn');
    const ungroupBtn = document.getElementById('ungroup-btn');
    const summaryPanel = document.getElementById('selection-summary');

    const newContainer = container.cloneNode(false);
    container.parentNode.replaceChild(newContainer, container);

    relatorioDiv.style.display = 'none';
    relatorioDiv.innerHTML = '';

    const renderTable = () => {
        const fillIdToGroupMap = new Map();
        result.operacoesProcessadas.forEach((op, index) => {
            const colorClass = `group-color-${(index % 6) + 1}`;
            [...op.entrada, ...op.saida].forEach(fill => {
                fillIdToGroupMap.set(fill.id, colorClass);
            });
        });

        const originalHeader = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" })[0];
        
        const matchedFills = [];
        const unmatchedFills = [];

        result.todosOsFills.forEach(fill => {
            if (fillIdToGroupMap.has(fill.id)) {
                matchedFills.push(fill);
            } else {
                unmatchedFills.push(fill);
            }
        });

        const generateRowsHTML = (fills) => {
            return fills.map(fill => {
                const groupClass = fillIdToGroupMap.get(fill.id) || 'unmatched-row';
                return `<tr data-fill-id="${fill.id}" class="${groupClass}">
                    <td class="select-col"><input type="checkbox" class="row-checkbox" /></td>
                    ${fill.raw.map(cell => `<td>${cell}</td>`).join('')}
                </tr>`;
            }).join('');
        };

        let tableHTML = `<table class="validation-table">
            <thead>
                <tr>
                    <th class="select-col"><input type="checkbox" id="select-all-checkbox" /></th>
                    ${originalHeader.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>`;
        
        if (matchedFills.length > 0) {
            tableHTML += `<tr><td colspan="${originalHeader.length + 1}" class="validation-section-header">Operações Agrupadas</td></tr>`;
            tableHTML += generateRowsHTML(matchedFills);
        }

        if (unmatchedFills.length > 0) {
            tableHTML += `<tr><td colspan="${originalHeader.length + 1}" class="validation-section-header">Ordens Não Agrupadas</td></tr>`;
            tableHTML += generateRowsHTML(unmatchedFills);
        }

        tableHTML += '</tbody></table>';
        newContainer.innerHTML = tableHTML;
    };

    const updateValidationUI = () => {
        const selectedRows = Array.from(newContainer.querySelectorAll('tr.selected'));
        const selectedUnmatched = selectedRows.filter(r => r.classList.contains('unmatched-row'));
        const selectedMatched = selectedRows.filter(r => !r.classList.contains('unmatched-row'));

        createBtn.disabled = selectedUnmatched.length < 2 || selectedMatched.length > 0;
        ungroupBtn.disabled = selectedMatched.length < 1 || selectedUnmatched.length > 0;
        
        if (selectedUnmatched.length === 0) {
            summaryPanel.style.display = 'none';
            return;
        }

        summaryPanel.style.display = 'block';
        const selectedFillIds = new Set(selectedUnmatched.map(row => row.dataset.fillId));
        const selectedFills = result.todosOsFills.filter(fill => selectedFillIds.has(fill.id));
        
        const symbol = selectedFills.length > 0 ? selectedFills[0].symbol : 'N/A';
        const symbolsMatch = selectedFills.every(f => f.symbol === symbol);

        const buys = selectedFills.filter(f => f.side === 'BUY');
        const sells = selectedFills.filter(f => f.side === 'SELL');
        const qtyIn = legSum(buys, 'qty');
        const qtyOut = legSum(sells, 'qty');
        const diff = qtyIn - qtyOut;
        const quantitiesMatch = Math.abs(diff) < 1e-8;
        
        const diffClass = quantitiesMatch ? 'valid' : 'invalid';

        summaryPanel.innerHTML = `
            <h4>Resumo da Seleção</h4>
            <div class="summary-line"><span>Símbolo:</span> <span>${symbolsMatch ? symbol : '<span class="invalid">Símbolos Misturados!</span>'}</span></div>
            <div class="summary-line"><span>Total Comprado:</span> <span>+${qtyIn.toFixed(8)}</span></div>
            <div class="summary-line"><span>Total Vendido:</span> <span>-${qtyOut.toFixed(8)}</span></div>
            <div class="summary-line ${diffClass}"><span>Diferença:</span> <span>${diff.toFixed(8)}</span></div>
        `;
    };

    newContainer.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || !row.dataset.fillId) return;

        if (e.target.type === 'checkbox') {
             row.classList.toggle('selected', e.target.checked);
        } else if (e.target.id !== 'select-all-checkbox' && !e.target.classList.contains('validation-section-header')) {
            const checkbox = row.querySelector('.row-checkbox');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                row.classList.toggle('selected', checkbox.checked);
            }
        }
        
        if(e.target.id === 'select-all-checkbox') {
            const isChecked = e.target.checked;
            newContainer.querySelectorAll('tbody .row-checkbox').forEach(cb => {
                cb.checked = isChecked;
                cb.closest('tr').classList.toggle('selected', isChecked);
            });
        }
        updateValidationUI();
    });

    createBtn.onclick = function() {
        const selectedUnmatched = newContainer.querySelectorAll('tr.selected.unmatched-row');
        const selectedFillIds = new Set(Array.from(selectedUnmatched).map(row => row.dataset.fillId));
        const selectedFills = result.todosOsFills.filter(fill => selectedFillIds.has(fill.id));

        const symbol = selectedFills[0].symbol;
        if (!selectedFills.every(f => f.symbol === symbol)) {
            alert('Erro: Todas as ordens selecionadas devem pertencer ao mesmo símbolo.'); return;
        }

        const buys = selectedFills.filter(f => f.side === 'BUY');
        const sells = selectedFills.filter(f => f.side === 'SELL');
        if (buys.length === 0 || sells.length === 0) {
            alert('Erro: Uma operação deve conter pelo menos uma compra e uma venda.'); return;
        }

        const qtyIn = legSum(buys, 'qty');
        const qtyOut = legSum(sells, 'qty');
        if (Math.abs(qtyIn - qtyOut) > 1e-8) {
            alert(`Erro: As quantidades não batem. Diferença de ${ (qtyIn - qtyOut).toFixed(8) }.`); return;
        }
        
        const hasRProfitData = selectedFills.some(f => f.rprofit !== 0 && f.rprofit !== undefined);
        const resultadoCalculado = hasRProfitData ? legSum(selectedFills, 'rprofit') : legSum(sells, "amount") - legSum(buys, "amount") - legSum(selectedFills, "fee");

        result.operacoesProcessadas.push({
            symbol: symbol, entrada: buys, saida: sells, totalQty: qtyIn,
            fees: legSum(selectedFills, "fee"), resultado: resultadoCalculado,
        });
        
        renderTable();
        updateValidationUI();
    };

    ungroupBtn.onclick = function() {
        const selectedMatched = newContainer.querySelectorAll('tr.selected:not(.unmatched-row)');
        const selectedFillIds = new Set(Array.from(selectedMatched).map(row => row.dataset.fillId));

        result.operacoesProcessadas.forEach(op => {
            op.entrada = op.entrada.filter(fill => !selectedFillIds.has(fill.id));
            op.saida = op.saida.filter(fill => !selectedFillIds.has(fill.id));
        });

        result.operacoesProcessadas = result.operacoesProcessadas.filter(op => op.entrada.length > 0 && op.saida.length > 0);
        
        renderTable();
        updateValidationUI();
    };

    document.getElementById('confirm-groups-btn').onclick = function() {
        validationDiv.style.display = 'none';
        relatorioDiv.style.display = 'block';

        result.operacoesProcessadas.sort((a, b) => new Date(a.entrada[0].date) - new Date(b.entrada[0].date));

        const capitalInicial = Number(document.getElementById("capital-inicial").value);
        const resumoFinal = recalcularResumo(result.operacoesProcessadas, capitalInicial);
        fullReportData = resumoFinal;
        
        try {
            localStorage.setItem('tradeReportData', JSON.stringify(resumoFinal));
            localStorage.setItem('tradeReportCapital', capitalInicial);
        } catch (e) {
            console.error("Não foi possível salvar o relatório no LocalStorage.", e);
        }

        renderLayoutAndControls(resumoFinal);

        relatorioDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    renderTable();
    validationDiv.style.display = 'block';
    document.getElementById('reset-btn').style.display = 'inline-block';
}


// --- 6. INICIALIZAÇÃO E EVENTOS GERAIS ---

document.addEventListener('DOMContentLoaded', function() {
    datePicker = new Litepicker({
        element: document.getElementById('exclusoes-dates'),
        singleMode: false,
        allowRepick: true,
        lang: 'pt-BR',
        tooltipText: { one: 'dia', other: 'dias' },
        buttonText: {
            previousMonth: `<svg width="11" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M11 0v16L0 8z" fill="#1746a0"/></svg>`,
            nextMonth: `<svg width="11" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M0 0v16l11-8z" fill="#1746a0"/></svg>`,
            reset: 'Limpar',
            apply: 'Aplicar',
        },
    });

    const savedReport = localStorage.getItem('tradeReportData');
    const savedCapital = localStorage.getItem('tradeReportCapital');
    if (savedReport && savedCapital) {
        try {
            const reportData = JSON.parse(savedReport);
            fullReportData = reportData;
            document.getElementById('capital-inicial').value = savedCapital;
            
            document.getElementById('trade-form').style.display = 'none';
            renderLayoutAndControls(reportData);
            document.getElementById('relatorio').style.display = 'block';
            document.getElementById('global-actions-container').style.display = 'flex';
            document.getElementById('reset-btn').style.display = 'inline-block';
        } catch (e) {
            console.error("Erro ao carregar relatório salvo.", e);
            localStorage.clear();
        }
    }
});

document.getElementById("reset-btn").addEventListener("click", function() {
    if (confirm("Tem certeza que deseja limpar o relatório e começar uma nova análise?")) {
        localStorage.removeItem('tradeReportData');
        localStorage.removeItem('tradeReportCapital');

        document.getElementById("trade-form").reset();
        if (datePicker) { datePicker.clearSelection(); }

        document.getElementById("relatorio").innerHTML = '';
        document.getElementById("validacao-operacoes").style.display = 'none';
        const erroDiv = document.getElementById("erro");
        erroDiv.innerHTML = '';
        erroDiv.style.display = 'none';
        
        if (capitalChartInstance) {
            capitalChartInstance.destroy();
            capitalChartInstance = null;
        }
        if (weeklyChartInstance) {
            weeklyChartInstance.destroy();
            weeklyChartInstance = null;
        }
        
        fullReportData = null;
        analysisResult = null;
        document.getElementById('global-actions-container').style.display = 'none';
        this.style.display = 'none';
        document.getElementById('trade-form').style.display = 'block';
    }
});
