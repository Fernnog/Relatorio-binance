// Espera o conteúdo da página carregar antes de executar o script
document.addEventListener('DOMContentLoaded', function() {
    
    // --- SELETORES DOS ELEMENTOS ---
    const gerarRelatorioBtn = document.getElementById('gerarRelatorioBtn');
    const novaAnaliseBtn = document.getElementById('novaAnaliseBtn');
    const areaRelatorios = document.getElementById('area-relatorios');

    // --- FUNÇÕES ---

    /**
     * Limpa a área de relatórios, zerando a tela para uma nova análise.
     */
    function limparAnalise() {
        areaRelatorios.innerHTML = '';
        console.log('Relatórios limpos. Pronto para nova análise.');
    }

    /**
     * Controla a visibilidade do container de detalhamento.
     */
    function toggleDetalhes() {
        const checkbox = document.getElementById('mostrarDetalhes');
        const detalhamentoContainer = document.getElementById('detalhamento-container');
        
        if (detalhamentoContainer) {
            // Adiciona ou remove a classe 'hidden' com base no estado do checkbox
            detalhamentoContainer.classList.toggle('hidden', !checkbox.checked);
        }
    }

    /**
     * Gera e insere o HTML dos relatórios na página.
     * Em um cenário real, esta função receberia os dados processados como argumento.
     */
    function gerarRelatorios() {
        // Limpa a análise anterior antes de gerar uma nova
        limparAnalise();

        // Verifica se a opção de detalhamento já existe e qual seu estado
        const detalheEstavaMarcado = document.getElementById('mostrarDetalhes')?.checked ?? true;

        const relatorioHTML = `
            <!-- OPÇÃO DE INCLUIR DETALHAMENTO -->
            <div class="opcoes-relatorio">
                <input type="checkbox" id="mostrarDetalhes" ${detalheEstavaMarcado ? 'checked' : ''}>
                <label for="mostrarDetalhes">Incluir detalhamento das operações</label>
            </div>

            <!-- RELATÓRIO PRINCIPAL -->
            <div id="relatorio-principal">
                <h2>RELATÓRIO DE PERFORMANCE DE TRADES</h2>
                <table>
                    <thead>
                        <tr><th>Métrica</th><th>Valor</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Total de Operações Analisadas</td><td>3</td></tr>
                        <tr><td>Operações com Lucro</td><td>2</td></tr>
                        <tr><td>Operações com Prejuízo</td><td>1</td></tr>
                        <tr><td>Operações Neutras</td><td>0</td></tr>
                        <tr><td>Taxa de Acerto</td><td>66.67%</td></tr>
                        <tr class="valor-lucro"><td>Ganhos Totais</td><td>+1.50 USDT</td></tr>
                        <tr class="valor-prejuizo"><td>Prejuízos Totais</td><td>-0.23 USDT</td></tr>
                        <tr><td>Total de Taxas Pagas</td><td>0.18 USDT</td></tr>
                        <tr class="destaque-final"><td>Resultado Líquido Final</td><td>1.27 USDT</td></tr>
                        <tr class="destaque-final"><td>Retorno sobre Capital Inicial</td><td>4.23%</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- DETALHAMENTO DAS OPERAÇÕES (em seu próprio container) -->
            <div id="detalhamento-container" class="${detalheEstavaMarcado ? '' : 'hidden'}">
                <h2>Detalhamento das Operações</h2>
                <table>
                    <thead>
                        <tr><th>Símbolo</th><th>Data Início</th><th>Resultado</th><th>Taxas</th></tr>
                    </thead>
                    <tbody>
                        <tr class="valor-prejuizo"><td>ETHUSDT</td><td>11/09/2025, 17:56:21</td><td>-0.23 USDT</td><td>0.08 USDT</td></tr>
                        <tr class="valor-lucro"><td>ETHUSDT</td><td>11/09/2025, 19:39:05</td><td>0.75 USDT</td><td>0.07 USDT</td></tr>
                        <tr class="valor-lucro"><td>ETHUSDT</td><td>12/09/2025, 15:07:10</td><td>0.75 USDT</td><td>0.04 USDT</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Insere o HTML gerado na página
        areaRelatorios.innerHTML = relatorioHTML;

        // Adiciona o 'listener' ao novo checkbox criado
        document.getElementById('mostrarDetalhes').addEventListener('change', toggleDetalhes);
    }

    // --- EVENT LISTENERS ---

    // Ao clicar no botão "Gerar Relatório", a função é chamada
    gerarRelatorioBtn.addEventListener('click', gerarRelatorios);

    // Ao clicar em "Nova Análise", a tela é limpa
    novaAnaliseBtn.addEventListener('click', limparAnalise);
});