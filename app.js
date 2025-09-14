// UTILIDADE: Identificação automática dos headers, considerando português e inglês
function mapColumns(headerRow) {
  const col = {};
  headerRow.forEach((h, i) => {
    const l = h.trim().toLowerCase();
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

// Cálculo e agrupamento das operações
function analisarOperacoes(fills, capitalInicial, exclusoes=[]) {
  // Filtro de exclusões (símbolos ou datas)
  let filtered = fills.filter(fill =>
    !exclusoes.some(exc =>
      fill.symbol.toLowerCase().includes(exc.toLowerCase()) ||
      fill.date.toISOString().slice(0,10).includes(exc)
    )
  );
  // Ordena por data
  filtered.sort((a, b) => a.date - b.date || a.side.localeCompare(b.side));
  // Agrupamento simplificado por símbolo + sequência e alternância de buy/sell
  let operacoes = [];
  let curr = [];
  for (let f of filtered) {
    if (curr.length === 0) {
      curr.push(f);
    } else {
      let ultimo = curr[curr.length-1];
      if (f.symbol === ultimo.symbol && f.side === ultimo.side && (f.date - ultimo.date)/1000 < 1200) {
        curr.push(f);
      } else if (f.symbol === ultimo.symbol && f.side !== ultimo.side) {
        curr.push(f);
        // Monta operação completa (entrada, saída)
        let entrada = curr.filter(x=>x.side==='BUY');
        let saida = curr.filter(x=>x.side==='SELL');
        let qIn = entrada.reduce((s, f) => s + f.qty, 0);
        let qOut = saida.reduce((s, f) => s + f.qty, 0);
        if (qIn>0 && qOut>0 && Math.abs(qIn - qOut) < 1e-8) {
          operacoes.push({
            symbol: ultimo.symbol,
            entrada,
            saida,
            totalQty: qIn,
            buyAvg: legWAvg(entrada, "price", "qty"),
            sellAvg: legWAvg(saida, "price", "qty"),
            fees: legSum(curr, "fee"),
            resultado: legSum(saida, "amount") - legSum(entrada, "amount") - legSum(curr, "fee"),
            bruto: legSum(saida, "amount") - legSum(entrada, "amount"),
          });
          curr = [];
        } else {
          // Não fecha? Continua acumulando até fechar quantidades
          // Ou zera se fugir demais (anti-loop)
          if (curr.length > 20) curr = [];
        }
      } else {
        // Mudou símbolo, finaliza ciclo incompleto
        curr = [f];
      }
    }
  }
  // Relatório financeiro resumido
  let ganhos=0, perdas=0, fees=0, lucro=0, win=0, loss=0, neutro=0;
  operacoes.forEach(op=>{
    fees += op.fees;
    if (op.resultado > 0) { ganhos += op.resultado; win++; }
    else if (op.resultado < 0) { perdas += op.resultado; loss++; }
    else neutro++;
    lucro += op.resultado;
  });
  return {
    total: operacoes.length,
    wins: win,
    losses: loss,
    neutros: neutro,
    taxaAcerto: operacoes.length ? ((win / operacoes.length) * 100).toFixed(2) : '0.00',
    ganhos: ganhos.toFixed(2),
    perdas: perdas.toFixed(2),
    fees: fees.toFixed(2),
    liquido: lucro.toFixed(2),
    retorno: operacoes.length && capitalInicial ? ((lucro / capitalInicial) * 100).toFixed(2) : '0.00',
    exclusoes,
    operacoes
  };
}
function legWAvg(arr, prop, qtyField) {
  let tqty = 0, sum = 0;
  arr.forEach(f => {
    sum += f[prop] * f[qtyField];
    tqty += f[qtyField];
  });
  return tqty ? sum / tqty : 0;
}
function legSum(arr, prop) {
  return arr.reduce((sum, fill) => sum + Number(fill[prop] || 0), 0);
}

// Função principal de upload e processamento
document.getElementById("trade-form").addEventListener("submit", function(e) {
  e.preventDefault();
  document.getElementById("relatorio").innerHTML = '';
  document.getElementById("erro").style.display = 'none';

  const fileInput = document.getElementById("trade-file");
  const capital = Number(document.getElementById("capital-inicial").value);
  const exclusoes = (document.getElementById("exclusoes").value || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!fileInput.files.length) return;
  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(evt) {
    let rows;
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
      console.log('Cabeçalho detectado:', header); // Ajuda debug no console
      const columns = mapColumns(header);
      // Vericação: são obrigatórias data, symbol & side
      if (columns.date === undefined || columns.symbol === undefined || columns.side === undefined) {
        throw "Colunas essenciais não encontradas. Cabeçalho encontrado: " + header.join(', ');
      }
      // Mostra mapeamento das colunas detectadas no console
      console.log('Mapeamento de colunas:', columns);
      const fills = data.slice(1).filter(row => row[columns.date]).map(row => normalizeRow(row, columns));
      const resumo = analisarOperacoes(fills, capital, exclusoes);
      renderReport(resumo, capital, header, columns);
    } catch (err) {
      document.getElementById("erro").innerHTML = "Erro ao analisar arquivo: <br>" + err;
      document.getElementById("erro").style.display = 'block';
    }
  };
  if (file.name.endsWith('.csv')) {
    reader.readAsBinaryString(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
});

function renderReport(r, capital, header, columns) {
  // Descreve qual campo foi localizado em qual coluna para fins didáticos
  let campoMapa = Object.keys(columns).map(
    key => `<li><strong>${key}</strong>: "${header[columns[key]]}" (coluna ${String.fromCharCode(65+columns[key])})</li>`
  ).join('');
  document.getElementById('relatorio').innerHTML = `
  <h2>RELATÓRIO DE PERFORMANCE DE TRADES</h2>
  <ul>
    <li><strong>Total de Operações Analisadas:</strong> ${r.total}</li>
    <li><strong>Operações com Lucro:</strong> ${r.wins}</li>
    <li><strong>Operações com Prejuízo:</strong> ${r.losses}</li>
    <li><strong>Operações Neutras:</strong> ${r.neutros}</li>
    <li><strong>Taxa de Acerto:</strong> ${r.taxaAcerto}%</li>
  </ul>
  <ul>
    <li><strong>Ganhos Totais:</strong> ${r.ganhos} USDT</li>
    <li><strong>Prejuízos Totais:</strong> ${r.perdas} USDT</li>
    <li><strong>Total de Taxas Pagas:</strong> ${r.fees} USDT</li>
    <li><strong>Resultado Líquido Final:</strong> ${r.liquido} USDT</li>
    <li><strong>Retorno sobre Capital Inicial:</strong> ${r.retorno}%</li>
  </ul>
  <ul>
    <li><strong>Lógica de Contagem:</strong> As operações foram identificadas consolidando preenchimentos sequenciais para formar Operações Lógicas completas (entrada + saída).</li>
    <li><strong>Exclusões:</strong> ${r.exclusoes.length ? r.exclusoes.join(', ') : 'Nenhuma exclusão aplicada'}.</li>
    <li><strong>Mapeamento dos campos:</strong>
      <ul>${campoMapa}</ul>
    </li>
  </ul>
  `;
}
