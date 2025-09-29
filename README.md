# Relatório de Performance de Trades

Esta é uma ferramenta web 100% client-side, desenvolvida em HTML, CSS e JavaScript puro (Vanilla JS), projetada para transformar históricos de trade de planilhas (.xlsx, .csv) em um relatório de performance claro e detalhado, rodando inteiramente no seu navegador.

O principal diferencial da aplicação é sua capacidade de realizar uma análise inteligente de operações, seguida por uma **etapa de validação e refinamento manual**, onde o usuário tem controle total para agrupar e desagrupar ordens (fills), garantindo a máxima precisão no resultado final de cada trade.

## Funcionalidades Principais

-   **Upload de Arquivos:** Suporte para planilhas nos formatos `.xlsx`, `.xls` e `.csv`.
-   **Mapeamento Automático de Colunas:** A ferramenta identifica automaticamente as colunas essenciais (data, símbolo, lado, quantidade, preço, etc.), mesmo que os cabeçalhos estejam em português ou inglês.
-   **Análise Inteligente (Automática):** O algoritmo primeiramente agrupa ordens parciais consecutivas do mesmo lado (compra ou venda) em "pernas" e combina pernas de entrada e saída para formar operações completas.

-   **Validação e Refinamento Manual Interativo:** Este é o coração da ferramenta. Após a análise automática, uma tela de validação permite ao usuário:
    -   **Visualizar Grupos:** As operações identificadas são destacadas com cores, enquanto ordens não agrupadas permanecem em cinza.
    -   **Criar Novos Grupos (Multi-leg):** Selecione múltiplas ordens de compra e venda não agrupadas para criar manualmente uma operação completa. A ferramenta suporta cenários complexos, como piramidação (múltiplas compras, uma venda) ou realizações parciais (uma compra, múltiplas vendas).
    -   **Desagrupar Operações:** Desfaça facilmente um agrupamento, seja ele automático ou criado manualmente, se precisar fazer correções.
    -   **Feedback em Tempo Real:** Um painel inteligente resume sua seleção ao vivo, mostrando totais de compra e venda e a diferença entre eles, tornando o processo de agrupamento manual rápido, intuitivo e à prova de erros.

-   **Cálculo Preciso de Resultados:** Se a planilha contiver uma coluna de "Lucro Realizado" (Realized Profit), a ferramenta a utilizará. Caso contrário, calcula o resultado manualmente (`Valor de Venda - Valor de Compra - Taxas`).

-   **Relatório de Performance Completo:** Exibe métricas chave como Total de Operações, Taxa de Acerto, **Ganhos/Prejuízos Brutos (antes das taxas)**, Taxas e o Resultado Líquido Final, com tooltips que explicam cada cálculo.
-   **Métricas Avançadas de Performance:** O relatório inclui **Fator de Lucro**, **Payoff Ratio** e **Drawdown Máximo**, com tooltips explicativos para aprofundar a análise da estratégia.
-   **Gráfico de Evolução de Capital:** Visualiza o crescimento (ou decrescimento) do capital inicial ao longo das operações analisadas, em ordem cronológica correta.
-   **Detalhamento de Operações:** Apresenta uma tabela com cada operação individual identificada, mostrando o símbolo, data de início, resultado e taxas.
-   **Filtros Interativos:** Permite filtrar o relatório gerado por ativo específico e excluir símbolos ou períodos de datas da análise inicial.
-   **Compartilhamento como Imagem:** Permite gerar uma imagem PNG limpa do resumo do relatório para fácil compartilhamento.
-   **Exportação para Análise (Markdown):** Gera um arquivo `.md` com um resumo completo da performance e uma tabela detalhada de todas as operações. O formato é otimizado para ser copiado e colado em prompts de Inteligência Artificial para análises mais profundas.
-   **Persistência Automática de Relatório:** Seu último relatório gerado é salvo automaticamente no navegador. Ao reabrir a página, você encontrará sua análise pronta, sem a necessidade de fazer o upload do arquivo novamente, oferecendo mais conveniência e agilidade.

## Como Usar

1.  Na sua primeira visita, abra o arquivo `index.html` em qualquer navegador moderno.
2.  Clique em "Escolher arquivo" e selecione sua planilha de histórico de trades.
3.  Informe o seu "Capital Inicial" no campo correspondente.
4.  (Opcional) Adicione símbolos (separados por vírgula) ou selecione um período de datas a serem ignorados na análise.
5.  Clique no botão "Gerar Relatório".
6.  A **tela de Validação de Agrupamentos** será exibida. Revise os grupos identificados automaticamente (linhas coloridas).
7.  Use os botões **"Criar Novo Grupo"** e **"Desagrupar Selecionados"** para ajustar as operações. Selecione as linhas desejadas e use o painel de resumo para validar sua seleção antes de confirmar a ação.
8.  Após finalizar seus ajustes, clique em **"Confirmar Grupos e Gerar Relatório"** para visualizar a análise de performance final.
9.  Após gerar o relatório, utilize os controles para filtrar por ativo, compartilhar como imagem ou **exportar os dados em formato Markdown** para análises futuras.

**Nota:** Após gerar um relatório, ele ficará salvo. Em sua próxima visita, o relatório será carregado automaticamente. Para iniciar uma nova análise do zero, basta clicar em **"Reiniciar Análise"** no topo da página.

## Formato da Planilha Esperado

Para que a análise funcione corretamente, sua planilha deve conter, no mínimo, as seguintes colunas:

-   **Obrigatórias:**
    -   `Data` (Date)
    -   `Símbolo` (Symbol)
    -   `Operação` / `Lado` (Side) - com valores como "BUY" e "SELL".
    -   `Quantidade` (Quantity)
    -   `Preço` (Price) ou `Valor Total` (Amount)

-   **Opcionais (Recomendadas para maior precisão):**
    -   `Taxa` (Fee)
    -   `Lucro Realizado` (Realized Profit / PnL) - Se presente, esta coluna será a fonte prioritária для o cálculo do resultado financeiro de cada operação.

## Detalhes Técnicos

-   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
-   A ferramenta é **100% client-side**, rodando inteiramente no seu navegador, sem a necessidade de um backend. Seus dados nunca saem da sua máquina.
-   **Bibliotecas Externas:**
    -   **SheetJS (xlsx.js):** Para a leitura e parse de arquivos de planilha diretamente no navegador.
    -   **Chart.js:** Para a renderização do gráfico de evolução de capital.
    -   **Litepicker:** Para o seletor de datas (calendário) com seleção de período.
    -   **html2canvas.js:** Para a funcionalidade de captura de tela e geração de imagem do relatório.
