# 🎯 PET Estatística — Gestão de Projetos

**Kanban board moderno e em tempo real para gestão de projetos do PET Estatística da UFSCar**, desenvolvido com Firebase e JavaScript vanilla.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📋 Características

### ✅ Funcionalidades Principais

- **Autenticação Segura** — Login com e-mail e senha via Firebase Auth
- **Quadros Kanban** — Crie, organize e gerencie boards em tempo real
- **Grupos de Boards** — Organize quadros em categorias
- **Tarefas Completas** — Títulos, descrições, etiquetas e prazos
- **Checklists** — Acompanhe progresso de subtarefas
- **Comentários** — Colabore com comentários em tempo real
- **Atribuição** — Designe responsáveis para tarefas
- **Calendário** — Visualize tarefas por data
- **Gestão de Usuários** — Admin pode criar/remover usuários
- **Tema Escuro** — Interface otimizada para produtividade
- **Modo Offline-Ready** — Funciona mesmo com conexão lenta

---

## 🛠️ Requisitos

- **Node.js** 16+ (para local development)
- **Firebase CLI** — Para deploy
- **Git** — Controle de versão
- **Navegador moderno** (Chrome, Firefox, Safari, Edge)

---

## 🚀 Instalação & Setup

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/pet-estatistica-kanban.git
cd pet-estatistica-kanban
```

### 2. Configurar Firebase (se for desenvolver)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Fazer login
firebase login

# Configurar projeto (já está setado como default)
firebase use pet-estatistica
```

### 3. Variáveis de Ambiente

As credenciais Firebase já estão no `index.html`. Para produção:

```javascript
// Em public/index.html, substitua FB_CONFIG com suas credenciais
const FB_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

---

## 🎮 Desenvolvimento Local

### Sem servidor (mais rápido)

```bash
# Abrir diretamente no navegador
open public/index.html
# ou via terminal
firefox public/index.html
```

### Com Firebase Local Emulator Suite

```bash
# Instalar dependências
npm install

# Iniciar emulador
firebase emulators:start

# Abrir http://localhost:4000
```

---

## 📦 Deploy

### Deploy para Firebase Hosting

```bash
# Build (se houver passo de build - atualmente não há)
npm run build

# Deploy
firebase deploy

# URL: https://pet-estatistica.web.app
```

### Verificar status do deploy

```bash
firebase hosting:channel:list
```

---

## 📁 Estrutura do Projeto

```
pet-estatistica-kanban/
├── public/
│   ├── index.html          # App principal (SPA única)
│   └── 404.html            # Página de erro
├── .firebase/              # Cache Firebase
├── .firebaserc             # Configuração Firebase
├── firebase.json           # Regras de hosting
├── skills-lock.json        # Skills do projeto
├── .gitignore              # Arquivos ignorados
└── README.md               # Este arquivo
```

### Próximas Estruturas Recomendadas

```
public/
├── index.html              # Mantém estrutura HTML base
├── css/
│   ├── tokens.css          # Design tokens
│   ├── layout.css          # Layout principal
│   ├── components.css      # Componentes reutilizáveis
│   └── theme.css           # Tema escuro/claro
├── js/
│   ├── main.js             # Entry point
│   ├── auth.js             # Autenticação
│   ├── db.js               # Firestore queries
│   ├── ui.js               # Renderização
│   └── utils.js            # Funções utilitárias
└── assets/
    ├── icons/
    └── fonts/
```

---

## 🔐 Segurança

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /boards/{boardId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Melhores Práticas

✅ Nunca commitar credenciais Firebase  
✅ Usar Firebase Security Rules (não confiar apenas no cliente)  
✅ Validar entrada de dados no servidor  
✅ Usar HTTPS em produção  

---

## 👥 Controle de Acesso

| Role | Permissões |
|------|-----------|
| **Admin** | Criar/editar/deletar boards, usuários, grupos |
| **Tutor** | Criar/editar boards, gerenciar membros |
| **Membro** | Criar/editar tarefas, comentar |

---

## 📱 Funcionalidades por Visão

### Login
- Autenticação com e-mail e senha
- Recuperação de senha via Firebase

### Sidebar
- Navegação entre boards
- Grupos de boards
- Criar novo board/grupo
- Perfil do usuário
- Botão de sair

### Board Principal
- Colunas Kanban (To Do, In Progress, Done, etc)
- Drag & drop de cards
- Busca de tarefas
- Membros do board
- Renomear/deletar board

### Card Detail Modal
- Titulo e descrição
- Etiquetas
- Checklist com progresso
- Comentários
- Data de vencimento
- Atribuição de responsáveis

### Calendário
- Visualização de tarefas por data
- Filtrar por responsável

---

## 🐛 Debugging

### Ver logs do Firebase

```bash
firebase functions:log
```

### Acessar Firestore no console

```bash
firebase firestore:list
```

### Dev Console do Browser

```javascript
// No console do navegador:
console.log(currentUser); // Usuário atual
console.log(boards);      // Boards carregados
```

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- Use `const` e `let` (não `var`)
- Nomes em camelCase para variáveis
- Nomes em kebab-case para CSS classes
- Comente funções complexas
- Siga o style existente

---

## 📞 Suporte & Contato

- **Issues**: Abra uma issue no GitHub
- **Discussões**: Use as discussions do repositório
- **Email**: pet-estatistica@ufscar.br

---

## 📄 Licença

MIT License — veja o arquivo LICENSE para detalhes.

---

## 🗂️ Roadmap

- [ ] Separar CSS em módulos
- [ ] Criar arquivo `package.json` com scripts
- [ ] Testes automatizados
- [ ] Suporte a exportar dados (CSV/Excel)
- [ ] Histórico de auditoria
- [ ] Notificações em tempo real
- [ ] Modo offline completo
- [ ] Suporte a temas (claro/escuro)

---

**Desenvolvido com ❤️ para o PET Estatística da UFSCar**