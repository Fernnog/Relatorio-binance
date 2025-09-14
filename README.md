# Relatório de Performance de Trades

Esta é uma ferramenta web front-end, desenvolvida em HTML, CSS e JavaScript puro (Vanilla JS), projetada para transformar históricos de trade de planilhas (.xlsx, .csv) em um relatório de performance claro e detalhado.

O principal diferencial da aplicação é sua capacidade de realizar uma análise inteligente de operações que foram executadas em múltiplas ordens (fills parciais), agrupando-as corretamente para refletir o resultado real de cada trade.

## Funcionalidades Principais

-   **Upload de Arquivos:** Suporte para planilhas nos formatos `.xlsx`, `.xls` e `.csv`.
-   **Mapeamento Automático de Colunas:** A ferramenta identifica automaticamente as colunas essenciais (data, símbolo, lado, quantidade, preço, etc.), mesmo que os cabeçalhos estejam em português ou inglês.
-   **Análise Inteligente de Operações:** O algoritmo agrupa ordens parciais consecutivas do mesmo lado (compra ou venda) em "pernas" e, em seguida, combina uma perna de entrada com uma perna de saída de quantidade correspondente para formar uma operação completa.
-   **Cálculo Preciso de Resultados:** Se a planilha contiver uma coluna de "Lucro Realizado" (Realized Profit), a ferramenta a utilizará para máxima precisão no cálculo do resultado. Caso contrário, calcula o resultado manualmente (`Valor de Venda - Valor de Compra - Taxas`).
-   **Relatório de Performance Completo:** Exibe métricas chave como Total de Operações, Taxa de Acerto, Ganhos/Prejuízos Totais, Taxas e o Resultado Líquido Final.
-   **Detalhamento de Operações:** Apresenta uma tabela com cada operação individual identificada, mostrando o símbolo, data de início, resultado e taxas.
-   **Compartilhamento como Imagem:** Permite gerar uma imagem PNG limpa de todo o relatório para fácil compartilhamento.

## Como Usar

1.  Abra o arquivo `index.html` em qualquer navegador moderno.
2.  Clique em "Escolher arquivo" e selecione sua planilha de histórico de trades.
3.  Informe o seu "Capital Inicial" no campo correspondente.
4.  (Opcional) Adicione símbolos ou datas a serem ignorados na análise, separados por vírgula.
5.  Clique no botão "Gerar Relatório".

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
    -   `Lucro Realizado` (Realized Profit / PnL) - Se presente, esta coluna será a fonte prioritária para o cálculo do resultado financeiro de cada operação.

## Detalhes Técnicos

-   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
-   **Bibliotecas Externas:**
    -   **SheetJS (xlsx.js):** Para a leitura e parse de arquivos de planilha diretamente no navegador.
    -   **html2canvas.js:** Para a funcionalidade de captura de tela e geração de imagem do relatório.
