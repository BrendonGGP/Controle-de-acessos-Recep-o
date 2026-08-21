/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ggp: {
          dark: '#1a1a1a',
          primary: '#00819c',
          secondary: '#65e7de',
          gray: '#595959',
        },
        // Sobrescrevendo o cinza do sistema para o fundo oficial da marca
        slate: {
          950: '#111111', // Fundo principal da aplicação (ligeiramente mais escuro para dar contraste)
          900: '#1a1a1a', // Fundo oficial da marca (para cartões e sidebar)
          800: '#2a2a2a', // Bordas sutis
          700: '#404040', // Bordas mais fortes
          600: '#595959', // Cinza oficial da marca (textos secundários)
          500: '#737373',
          400: '#a3a3a3',
          300: '#d4d4d4',
          200: '#e5e5e5',
          100: '#f5f5f5',
        },
        // Sobrescrevendo o azul do sistema para o Azul Petróleo e Mint oficiais
        blue: {
          400: '#65e7de', // Mint oficial (Hover, destaques, ícones claros)
          500: '#33b4c9', // Intermediário
          600: '#00819c', // Teal oficial (Botões principais, navegação ativa)
          700: '#00657a', // Teal escuro (Hover de botões)
          800: '#004857', // Fundo de alertas
          900: '#002b33', // Sombras e fundos translúcidos
        }
      }
    },
  },
  plugins: [],
}
