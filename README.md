# Sistema de Recepção GGP 🏢

![GGP Logo](https://img.shields.io/badge/GGP-Grupo%20Gomes%20Pires-00819c?style=for-the-badge)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

Um sistema completo de gerenciamento de portaria, controle de acessos e agendamento de salas de reunião desenvolvido exclusivamente para o **Grupo Gomes Pires (GGP)**. O sistema automatiza a recepção, notifica colaboradores via WhatsApp em tempo real e garante a segurança e controle do fluxo de pessoas na holding.

## ✨ Funcionalidades

- 📅 **Gestão de Salas de Reunião:** Painel em tempo real mostrando salas ocupadas e disponíveis. Permite agendar, editar e cancelar reuniões com convite a participantes.
- 🛡️ **Controle de Acesso (Check-in/Check-out):** Registro de visitantes, prestadores de serviço e candidatos. O sistema notifica automaticamente o colaborador anfitrião assim que a entrada é registrada.
- 👥 **Gestão de Colaboradores e Usuários:** Cadastro completo de colaboradores (com cargos e departamentos) e sistema de permissões (Administradores vs Recepcionistas).
- 💬 **Integração com WhatsApp:** Notificações instantâneas enviadas via Z-API para avisar os colaboradores sobre suas reuniões e sobre a chegada de suas visitas.
- 🎨 **Identidade Visual Corporativa:** Design responsivo, elegante e no padrão visual Dark Mode oficial do Grupo Gomes Pires.

## 🛠️ Tecnologias Utilizadas

**Frontend:**
- [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) (Estilização baseada no Manual de Marca)
- [Lucide React](https://lucide.dev/) (Ícones)
- [shadcn/ui](https://ui.shadcn.com/) (Componentes Base)
- React Router (Navegação)

**Backend / BaaS:**
- [Supabase](https://supabase.com/) (Autenticação, PostgreSQL e RLS)
- **Edge Functions** em Deno para integrações (Notificações WhatsApp e gerenciamento de permissões)
- **Z-API** para envio de mensagens no WhatsApp

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js (v18+)
- Supabase CLI (para testes locais do backend, opcional)
- Chaves do Supabase (URL e Anon Key)

### Passos

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/BrendonGGP/Controle-de-acessos-Recep-o.git
   ```

2. **Acesse a pasta do frontend e instale as dependências:**
   ```bash
   cd "Controle-de-acessos-Recep-o/frontend"
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na pasta `frontend` e adicione suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse no navegador:**
   O projeto estará rodando em `http://localhost:5173`.

## 📁 Estrutura do Projeto

```
/
├── frontend/                 # Aplicação React
│   ├── src/                  
│   │   ├── components/       # Componentes reutilizáveis (UI)
│   │   ├── contexts/         # Contextos (Autenticação)
│   │   ├── layouts/          # Layout principal (Sidebar e navegação)
│   │   ├── lib/              # Configurações utilitárias (Supabase client)
│   │   └── pages/            # Telas da aplicação (Salas, Admin, etc.)
│   └── tailwind.config.js    # Configurações de cores oficiais GGP
│
└── supabase/                 # Configurações de Backend
    ├── functions/            # Edge Functions (notify-access, notify-booking, etc.)
    └── migrations/           # Esquemas de Banco de Dados SQL
```

## 🔐 Autenticação e Perfis
O sistema possui duas permissões principais baseadas em Roles:
- **Admin:** Acesso total, incluindo criação e deleção de usuários e cargos.
- **Recepção:** Acesso operacional (Controle de Acessos, Agendamentos e Mensagens).

---
*Desenvolvido para uso interno do Grupo Gomes Pires.*
