# 🚀 CRM Pipeline Pro

O **CRM Pipeline Pro** é uma plataforma moderna e completa para gestão de leads, oportunidades de vendas e pipeline de atendimento omnichannel. O sistema conta com uma arquitetura dividida em um backend robusto construído em **Go (Golang)** com PostgreSQL e um frontend dinâmico em **React** com Tailwind CSS e drag-and-drop.

---

## 📌 Principais Funcionalidades

- **Autenticação Segura & OTP:** Cadastro de usuários com hash de senha via Bcrypt e validação obrigatória por código de verificação (OTP de 6 dígitos) enviado por e-mail transacional.
- **Trava de Verificação (Auth Lock):** Bloqueio de login automático para contas pendentes de confirmação.
- **Gestão de Leads (Kanban & Tabela):** Transição de status via arrastar e soltar (*drag-and-drop*) com estatísticas em tempo real do pipeline.
- **Módulo Omnichannel:** Interface preparada para centralização de canais de atendimento (WhatsApp Cloud API, Instagram Direct, Meta Graph API e TikTok Ads).
- **Anotações e Histórico por Lead:** Chat/anotações internas para acompanhamento do histórico de negociação de cada cliente.
- **Exportação de Dados:** Exportação de relatórios de oportunidades em formato CSV com um clique.

---

## 🛠️ Tecnologias Utilizadas

### **Backend**
- **Linguagem:** Go (Golang)
- **Framework Web:** Gin Gonic
- **ORM:** GORM
- **Banco de Dados:** PostgreSQL
- **Autenticação:** JWT (JSON Web Tokens) & Bcrypt
- **Envio de E-mail:** SMTP Transacional (Resend / Mailtrap / Custom SMTP)

### **Frontend**
- **Biblioteca Base:** React.js (Vite)
- **Estilização:** Tailwind CSS
- **Ícones:** Lucide React
- **Kanban / Drag and Drop:** `@hello-pangea/dnd`
- **Requisições HTTP:** Axios

---

## ⚙️ Arquitetura e Estrutura do Projeto

## ✉️ Configuração de e-mail

No ambiente de produção, configure estas variáveis no Render:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=CRM Pipeline <noreply@seudominioverificado.com>
JWT_SECRET=uma-chave-longa-e-segura
```

O endereço usado em `EMAIL_FROM` precisa pertencer a um domínio verificado no Resend. O remetente `onboarding@resend.dev` só deve ser usado para testes permitidos pela conta do Resend.

Sem `RESEND_API_KEY`, o cadastro e a recuperação de senha retornam erro explícito em vez de informar falsamente que o código foi enviado.

```text
CRM/
├── cmd/
│   └── api/
│       └── main.go           # Ponto de entrada da aplicação Go
├── config/
│   ├── database.go       # Conexão e auto-migrations do PostgreSQL
│   └── jwt.go            # Geração e validação de tokens JWT
├── controllers/
│   ├── auth.go           # Controladores de registro, login e OTP
│   └── leads.go          # Controladores de CRUD do Kanban/Tabela
├── models/
│   ├── usuario.go        # Modelo da tabela de usuários e status de verificação
│   ├── lead.go           # Modelo de oportunidades do CRM
│   └── mensagem.go       # Modelo para histórico de interações/anotações
├── utils/
│   └── email.go          # Validação de sintaxe e envio de e-mails via SMTP
├── crm-frontend/         # Aplicação React (Vite)
│   ├── src/
│   │   ├── App.jsx       # Interface principal e gerenciamento de estado
│   │   └── main.jsx
│   └── package.json
├── .env                  # Variáveis de ambiente (ignorado no Git)
├── .gitignore
├── go.mod
└── go.sum
