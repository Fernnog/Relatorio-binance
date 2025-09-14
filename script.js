// Função utilitária para identificação automática de colunas
function mapColumns(headerRow) {
  // Mapeamento simples baseado em nomes "famosos", pode expandir para fuzzy/regex
  const col = {}; // chave lógica : índice
  headerRow.forEach((h,i) => {
    const l = h.trim().toLowerCase();
    if (l.includes('date')) col.date = i;
    else if (l.includes('símbolo') || l.includes('symbol')) col.symbol = i;
    else if (l.includes('side') || l.includes('operação')) col.side = i;
    else if (l.includes('price') || l.includes('preço')) col.price = i;
    else if (l.includes('quant') || l.includes('quantity')) col.qty = i;
    else if (l.includes('fee')) col.fee = i;
    else if (l.includes('realized profit') || l.includes('lucro')) col.rprofit = i;
    else if (l.includes('amount') || l.includes('valor')) col.amount = i;
  });
  return col;
}

// Função para normalizar a linha do excel/csv para objeto JS
function normalizeRow(row, columns) {
  return {
    date: new Date(row[columns.date]),
    symbol: (row[columns.symbol] || '').trim(),
    side: (row[columns.side] || '').trim().toUpperCase(),
    price: Number(row[columns.price]),
    qty: Number(row[columns.qty]),
    fee: Number(row[columns.fee]),
    rprofit: Number(row[columns.rprofit] || 0),
    amount: Number(row[columns.amount]),
    raw: row
  };
}

// Função para análise consolidada de performance (versão simplificada, apta para expandir)
function analisarOperacoes(fills, capitalInicial, exclusoes=[]) {
  // Exclusões: símbolo ou string da data
  let filtered = fills.filter(fill => 
    !exclusoes.some(exc =>
      fill.symbol.toLowerCase().includes(exc.toLowerCase()) ||
      fill.date.toISOString().slice(0,10).includes(exc)
    )
  );
  // Ordenar por data/hora
  filtered.sort((a,b) => a.date-b.date||a.side.localeCompare(b.side));
  const consolidado = [];
  const fila = [];
  filtered.forEach(fill => {
    if (fila.length === 0 || fila[fila.length-1].side === fill.side || Math.abs((fila[fila.length-1].date-fill.date)/1000)<180) {
      fila.push(fill);
    } else {
      consolidado.push([...fila]);
      fila.length=0;
      fila.push(fill);
    }
  });
  if (fila.length>0) consolidado.push([...fila]);
  // Agora pareamento FIFO entre entradas e saídas (por símbolo)
  const operacoes = [];
  let legs = [];
  for (let group of consolidado) {
    for (let fill of group) {
      legs.push(fill);
    }
    // Se mudamos de lado, fechar operação
    if (legs.length>=2 && legs[0].side!==legs[legs.length-1].side) {
      let entrada = legs.filter(f=>f.side==="BUY");
      let saida = legs.filter(f=>f.side==="SELL");
      let qIn = entrada.reduce((s,f)=>s+f.qty,0);
      let qOut = saida.reduce((s,f)=>s+f.qty,0);
      if (qIn===qOut) { // só fecha se balanced
        operacoes.push({
          symbol: legs[0].symbol,
          entrada, 
          saida,
          totalQty:qIn,
          fees:legSum(legs,"fee"),
          buyAvg: legWAvg(entrada,"price","qty"),
          sellAvg: legWAvg(saida,"price","qty"),
          resultado: legSum(saida,"amount")-legSum(entrada,"amount")-legSum(legs,"fee"),
          bruto: legSum(saida,"amount")-legSum(entrada,"amount"),
        });
        legs=[];
      }
    }
  }
  // Agora relatório financeiro:
  let ganhos=0, perdas=0, fees=0, lucro=0, win=0, loss=0, neutro=0;
  operacoes.forEach(op=>{
    fees += op.fees;
    if (op.resultado>0) { ganhos+=op.resultado; win++; }
    else if (op.resultado<0) { perdas+=op.resultado; loss++; }
    else neutro++;
    lucro += op.resultado;
  });
  return {
    total: operacoes.length,
    wins: win,
    losses: loss,
    neutros: neutro,
    taxaAcerto: operacoes.length?((win/operacoes.length)*100).toFixed(2):'0.00',
    ganhos: ganhos.toFixed(2),
    perdas: perdas.toFixed(2),
    fees: fees.toFixed(2),
    liquido: lucro.toFixed(2),
    retorno: operacoes.length?((lucro/capitalInicial)*100).toFixed(2):'0.00',
    exclusoes,
    operacoes
  };
}
function legWAvg(arr, prop, qtyField) {
  let tqty=0, sum=0;
  arr.forEach(f=>{
    sum+=f[prop]*f[qtyField];
    tqty+=f[qtyField];
  });
  return tqty ? sum/tqty : 0;
}
function legSum(arr, prop) {
  return arr.reduce((sum,fill)=>sum+Number(fill[prop]||0),0);
}

// Evento principal
document.getElementById("trade-form").addEventListener("submit", function(e) {
  e.preventDefault();
  document.getElementById("relatorio").innerHTML = '';
  document.getElementById("erro").style.display = 'none';
  const fileInput = document.getElementById("trade-file");
  const capital = Number(document.getElementById("capital-inicial").value);
  const exclusoes = (document.getElementById("exclusoes").value || '').split(',').map(s=>s.trim()).filter(Boolean);

  if (!fileInput.files.length) return;
  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(evt) {
    let rows;
    try {
      let workbook;
      if (file.name.endsWith('.csv')) {
        workbook = XLSX.read(evt.target.result, {type:'binary'});
      } else {
        workbook = XLSX.read(evt.target.result, {type:'array'});
      }
      const firstSheet = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {header:1, defval:""});
      const header = data[0];
      const columns = mapColumns(header);
      if (!columns.date || !columns.symbol || !columns.side) {
        throw "Colunas essenciais não encontradas";
      }
      const fills = data.slice(1).filter(row=>row[columns.date]).map(row=>normalizeRow(row, columns));
      const resumo = analisarOperacoes(fills, capital, exclusoes);

      // Exibir relatório
      renderReport(resumo, capital);
    } catch(err) {
      document.getElementById("erro").textContent = "Erro ao analisar arquivo: "+err;
      document.getElementById("erro").style.display = 'block';
    }
  };
  if (file.name.endsWith('.csv')) {
    reader.readAsBinaryString(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
});

function renderReport(r, capital) {
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
    <li><strong>Lógica de Contagem:</strong> As operações foram identificadas consolidando preenchimentos sequenciais para formar Operações Lógicas completas (ciclo de entrada e saída).</li>
    <li><strong>Exclusões:</strong> ${r.exclusoes.length?r.exclusoes.join(', '):'Nenhuma exclusão aplicada'}.</li>
  </ul>
  `;
}
