// Crie este novo arquivo na raiz do seu projeto.

/**
 * Define a URL base para as chamadas de API.
 * Altere 'SEU-PROJETO-VERCEL.vercel.app' para a URL real do seu deploy.
 */
const VERCEL_PRODUCTION_URL = 'https://relatorio-binance-git-main-fernandos-projects-f93e0792.vercel.app/'; 

// Verifica se a página está hospedada no GitHub Pages para decidir qual URL usar.
const isGitHubPages = window.location.hostname.includes('github.io');

// A variável global que será usada pelo api-client.js
const API_BASE_URL = isGitHubPages ? VERCEL_PRODUCTION_URL : ''; 
