// Popula dados de exemplo (canais, contatos, conversas, mensagens) para você
// visualizar a inbox funcionando antes de plugar APIs reais (Fase 3/4).
// Rodar uma única vez: node src/seed_inbox.js
const db = require('./db');
const convManager = require('./conversation_manager');

function alreadySeeded() {
    const row = db.prepare('SELECT COUNT(*) AS total FROM channels').get();
    return row.total > 0;
}

function seed() {
    if (alreadySeeded()) {
        console.log('Seed ignorado: já existem canais cadastrados no banco.');
        return;
    }

    const whatsapp = convManager.createChannel({
        type: 'whatsapp',
        display_name: 'WhatsApp Principal',
        config: { phone_number_id: null, access_token: null }, // preenchido na Fase 3
    });

    const instagram = convManager.createChannel({
        type: 'instagram',
        display_name: 'Instagram NexusTech',
        config: { page_id: null, access_token: null }, // preenchido na Fase 4
    });

    const site = convManager.createChannel({
        type: 'site',
        display_name: 'Chat do Site',
        config: {},
    });

    const contato1 = convManager.createContact({
        name: 'Maria Fernanda',
        phone: '+5519991234567',
        whatsapp_id: '5519991234567',
    });

    const contato2 = convManager.createContact({
        name: 'Carlos Eduardo',
        email: 'carlos@exemplo.com.br',
        instagram_id: 'carlos.eduardo.ig',
    });

    const contato3 = convManager.createContact({
        name: 'Visitante do Site',
        email: null,
    });

    const conv1 = convManager.createConversation({
        contact_id: contato1.id,
        channel_id: whatsapp.id,
        department: 'Suporte',
        department_color: 'rgb(171, 20, 158)',
    });
    convManager.addMessage({ conversation_id: conv1.id, direction: 'inbound', sender_name: 'Maria Fernanda', content: 'Olá, bom dia! Preciso de ajuda com meu pedido.' });
    convManager.addMessage({ conversation_id: conv1.id, direction: 'outbound', sender_name: 'Você', content: 'Bom dia, Maria! Pode me passar o número do pedido?' });

    const conv2 = convManager.createConversation({
        contact_id: contato2.id,
        channel_id: instagram.id,
        department: 'Implantação',
        department_color: 'rgb(219, 62, 0)',
    });
    convManager.addMessage({ conversation_id: conv2.id, direction: 'inbound', sender_name: 'Carlos Eduardo', content: 'Vi o anúncio de vocês, como funciona o sistema?' });

    const conv3 = convManager.createConversation({
        contact_id: contato3.id,
        channel_id: site.id,
        department: 'Vendas',
        department_color: 'rgb(37, 99, 235)',
    });
    convManager.addMessage({ conversation_id: conv3.id, direction: 'inbound', sender_name: 'Visitante do Site', content: 'Qual o valor do plano mensal?' });
    convManager.addMessage({ conversation_id: conv3.id, direction: 'outbound', sender_name: 'Você', content: 'Olá! Temos planos a partir de R$ 99/mês. Posso te enviar mais detalhes por e-mail?' });

    console.log('Seed concluído: 3 canais, 3 contatos, 3 conversas, 5 mensagens.');
}

seed();
