const express = require('express');
const cors = require('cors');
const eventTracker = require('./event_tracker');
const leadManager = require('./lead_manager');
const { validarLead } = require('./schema_validator');
const convManager = require('./conversation_manager');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

console.log("Inicializando o motor principal do CRM...");

// Definição da rota da API para leitura do banco de dados
app.get('/api/leads', (req, res) => {
    try {
        const leads = leadManager.getLeads();
        res.status(200).json(leads);
    } catch (error) {
        console.error("Erro na leitura do banco de dados:", error);
        res.status(500).json({ status: "erro", mensagem: "Falha ao recuperar os registros do sistema." });
    }
});

// Injeção do middleware 'validarLead' para proteger a rota POST
app.post('/api/event', validarLead, (req, res) => {
    try {
        const payload = req.body;
        eventTracker.captureEvent('manual_event_SUBMIT_LEAD_FORM', payload);
        res.status(200).json({ status: "sucesso", mensagem: "Evento processado e lead registrado no banco." });
    } catch (error) {
        console.error("Erro interno no servidor:", error);
        res.status(500).json({ status: "erro", mensagem: "Falha na gravação do registro." });
    }
});

// Rota PUT para modificação do status de conversão do lead com auditoria
app.put('/api/leads/:id/status', (req, res) => {
    try {
        const leadId = req.params.id;
        const { newStatus } = req.body;
        
        const sucesso = leadManager.updateLeadStatus(leadId, newStatus);
        
        if (sucesso) {
            console.log(`Log de Sistema - Status do lead [${leadId}] modificado para: ${newStatus}`);
            res.status(200).json({ status: "sucesso", mensagem: "Status modificado com êxito." });
        } else {
            console.log(`Aviso de Sistema - Tentativa de atualização em registro inexistente: [${leadId}]`);
            res.status(404).json({ status: "erro", mensagem: "Registro não localizado." });
        }
    } catch (error) {
        console.error("Erro na atualização do banco de dados:", error);
        res.status(500).json({ status: "erro", mensagem: "Falha na transação de atualização." });
    }
});

// Rota DELETE para purgar um registro do banco de dados com auditoria
app.delete('/api/leads/:id', (req, res) => {
    try {
        const leadId = req.params.id;
        const sucesso = leadManager.deleteLead(leadId);
        
        if (sucesso) {
            console.log(`Log de Sistema - Registro expurgado da base de dados: [${leadId}]`);
            res.status(200).json({ status: "sucesso", mensagem: "Registro excluído permanentemente." });
        } else {
            console.log(`Aviso de Sistema - Tentativa de exclusão em registro inexistente: [${leadId}]`);
            res.status(404).json({ status: "erro", mensagem: "Registro não localizado." });
        }
    } catch (error) {
        console.error("Erro na exclusão de dados:", error);
        res.status(500).json({ status: "erro", mensagem: "Falha na transação de exclusão." });
    }
});

// ============================================================
// Rotas da Inbox Omnichannel (Fase 1 — modelo de dados e CRUD)
// ============================================================

// Lista conversas (com filtros opcionais de status, canal e busca por nome)
app.get('/api/conversations', (req, res) => {
    try {
        const { status, channel_type, search } = req.query;
        const conversations = convManager.listConversations({ status, channel_type, search });
        res.status(200).json(conversations);
    } catch (error) {
        console.error("Erro ao listar conversas:", error);
        res.status(500).json({ status: "erro", mensagem: "Falha ao recuperar as conversas." });
    }
});

// Detalhe de uma conversa (dados do contato + histórico de mensagens)
app.get('/api/conversations/:id', (req, res) => {
    try {
        const conversation = convManager.getConversationDetail(req.params.id);
        if (!conversation) {
            return res.status(404).json({ status: "erro", mensagem: "Conversa não localizada." });
        }
        res.status(200).json(conversation);
    } catch (error) {
        console.error("Erro ao buscar conversa:", error);
        res.status(500).json({ status: "erro", mensagem: "Falha ao recuperar a conversa." });
    }
});

// Envia uma nova mensagem outbound numa conversa
// NOTA (Fase 3): aqui é onde entrará a chamada real à WhatsApp Cloud API / Meta Graph API
// para efetivamente disparar a mensagem no canal externo antes de persistir como 'sent'.
app.post('/api/conversations/:id/messages', (req, res) => {
    try {
        const { content, sender_name } = req.body;
        if (!content || typeof content !== 'string') {
            return res.status(400).json({ status: "erro", mensagem: "O campo 'content' é obrigatório." });
        }

        const conversation = convManager.getConversationDetail(req.params.id);
        if (!conversation) {
            return res.status(404).json({ status: "erro", mensagem: "Conversa não localizada." });
        }

        const message = convManager.addMessage({
            conversation_id: req.params.id,
            direction: 'outbound',
            content,
            sender_name: sender_name || 'Você',
        });

        console.log(`Log de Sistema - Mensagem enviada na conversa [${req.params.id}]`);
        res.status(201).json(message);
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        res.status(500).json({ status: "erro", mensagem: "Falha ao enviar a mensagem." });
    }
});

// Marca conversa como lida (zera unread_count)
app.put('/api/conversations/:id/read', (req, res) => {
    try {
        const sucesso = convManager.markConversationRead(req.params.id);
        if (!sucesso) return res.status(404).json({ status: "erro", mensagem: "Conversa não localizada." });
        res.status(200).json({ status: "sucesso" });
    } catch (error) {
        res.status(500).json({ status: "erro", mensagem: "Falha ao marcar como lida." });
    }
});

// Altera status da conversa (open / pending / closed)
app.put('/api/conversations/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['open', 'pending', 'closed'];
        if (!valid.includes(status)) {
            return res.status(400).json({ status: "erro", mensagem: `Status deve ser um de: ${valid.join(', ')}` });
        }
        const sucesso = convManager.updateConversationStatus(req.params.id, status);
        if (!sucesso) return res.status(404).json({ status: "erro", mensagem: "Conversa não localizada." });
        res.status(200).json({ status: "sucesso" });
    } catch (error) {
        res.status(500).json({ status: "erro", mensagem: "Falha ao atualizar status da conversa." });
    }
});

// Fixa/desfixa (favorita) uma conversa
app.put('/api/conversations/:id/favorite', (req, res) => {
    try {
        const novoValor = convManager.toggleFavorite(req.params.id);
        if (novoValor === null) return res.status(404).json({ status: "erro", mensagem: "Conversa não localizada." });
        res.status(200).json({ status: "sucesso", is_favorite: novoValor });
    } catch (error) {
        res.status(500).json({ status: "erro", mensagem: "Falha ao favoritar conversa." });
    }
});

// Lista canais configurados (WhatsApp, Instagram, Facebook, Site)
app.get('/api/channels', (req, res) => {
    try {
        res.status(200).json(convManager.listChannels());
    } catch (error) {
        res.status(500).json({ status: "erro", mensagem: "Falha ao recuperar os canais." });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor HTTP operando em http://localhost:${PORT}`);
    console.log(`Aguardando submissões e validações ativas...`);
});