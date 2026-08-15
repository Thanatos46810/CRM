const crypto = require('crypto');
const db = require('./db');

function newId(prefix) {
    return `${prefix}_${crypto.randomUUID()}`;
}

// ---------- Canais ----------

function createChannel({ type, display_name, config = {} }) {
    const id = newId('chn');
    db.prepare(`
        INSERT INTO channels (id, type, display_name, config_json)
        VALUES (?, ?, ?, ?)
    `).run(id, type, display_name, JSON.stringify(config));
    return getChannel(id);
}

function getChannel(id) {
    const row = db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
    if (!row) return null;
    return { ...row, config: JSON.parse(row.config_json) };
}

function listChannels() {
    return db.prepare('SELECT * FROM channels ORDER BY created_at ASC').all()
        .map(row => ({ ...row, config: JSON.parse(row.config_json) }));
}

// ---------- Contatos ----------

function createContact({ name, avatar_url = null, phone = null, email = null, whatsapp_id = null, instagram_id = null, facebook_id = null, lead_id = null }) {
    const id = newId('cnt');
    db.prepare(`
        INSERT INTO contacts (id, name, avatar_url, phone, email, whatsapp_id, instagram_id, facebook_id, lead_id)
        VALUES (@id, @name, @avatar_url, @phone, @email, @whatsapp_id, @instagram_id, @facebook_id, @lead_id)
    `).run({ id, name, avatar_url, phone, email, whatsapp_id, instagram_id, facebook_id, lead_id });
    return getContact(id);
}

function getContact(id) {
    return db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) || null;
}

function findContactByChannelIdentifier(field, value) {
    const allowed = ['whatsapp_id', 'instagram_id', 'facebook_id'];
    if (!allowed.includes(field)) throw new Error('Campo de identificação de canal inválido.');
    return db.prepare(`SELECT * FROM contacts WHERE ${field} = ?`).get(value) || null;
}

// ---------- Conversas ----------

function createConversation({ contact_id, channel_id, department = null, department_color = null }) {
    const id = newId('conv');
    db.prepare(`
        INSERT INTO conversations (id, contact_id, channel_id, department, department_color)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, contact_id, channel_id, department, department_color);
    return getConversationDetail(id);
}

// Lista de conversas no formato "linha da inbox" (o que a lista lateral precisa)
function listConversations({ status = null, channel_type = null, search = null } = {}) {
    let query = `
        SELECT
            conv.id, conv.status, conv.department, conv.department_color,
            conv.is_favorite, conv.last_message_at, conv.unread_count,
            c.id AS contact_id, c.name AS contact_name, c.avatar_url AS contact_avatar,
            ch.id AS channel_id, ch.type AS channel_type, ch.display_name AS channel_display_name,
            (SELECT content FROM messages m WHERE m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_content,
            (SELECT sender_name FROM messages m WHERE m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender,
            (SELECT delivery_status FROM messages m WHERE m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_status
        FROM conversations conv
        JOIN contacts c ON c.id = conv.contact_id
        JOIN channels ch ON ch.id = conv.channel_id
        WHERE 1=1
    `;
    const params = [];

    if (status) {
        query += ' AND conv.status = ?';
        params.push(status);
    }
    if (channel_type) {
        query += ' AND ch.type = ?';
        params.push(channel_type);
    }
    if (search) {
        query += ' AND c.name LIKE ?';
        params.push(`%${search}%`);
    }

    query += ' ORDER BY conv.last_message_at DESC';

    return db.prepare(query).all(...params);
}

function getConversationDetail(conversationId) {
    const conv = db.prepare(`
        SELECT conv.*, c.name AS contact_name, c.avatar_url AS contact_avatar, c.phone AS contact_phone,
               c.email AS contact_email, ch.type AS channel_type, ch.display_name AS channel_display_name
        FROM conversations conv
        JOIN contacts c ON c.id = conv.contact_id
        JOIN channels ch ON ch.id = conv.channel_id
        WHERE conv.id = ?
    `).get(conversationId);

    if (!conv) return null;

    const messages = db.prepare(`
        SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
    `).all(conversationId);

    return { ...conv, messages };
}

function updateConversationStatus(conversationId, status) {
    const result = db.prepare('UPDATE conversations SET status = ? WHERE id = ?').run(status, conversationId);
    return result.changes > 0;
}

function toggleFavorite(conversationId) {
    const conv = db.prepare('SELECT is_favorite FROM conversations WHERE id = ?').get(conversationId);
    if (!conv) return null;
    const newValue = conv.is_favorite ? 0 : 1;
    db.prepare('UPDATE conversations SET is_favorite = ? WHERE id = ?').run(newValue, conversationId);
    return !!newValue;
}

// ---------- Mensagens ----------

// direction: 'inbound' (contato -> você) ou 'outbound' (você -> contato)
function addMessage({ conversation_id, direction, content, sender_name = null, message_type = 'text', external_id = null, delivery_status = 'sent' }) {
    const id = newId('msg');

    db.exec('BEGIN');
    try {
        db.prepare(`
            INSERT INTO messages (id, conversation_id, direction, sender_name, content, message_type, external_id, delivery_status)
            VALUES (@id, @conversation_id, @direction, @sender_name, @content, @message_type, @external_id, @delivery_status)
        `).run({ id, conversation_id, direction, sender_name, content, message_type, external_id, delivery_status });

        db.prepare(`
            UPDATE conversations
            SET last_message_at = datetime('now'),
                unread_count = CASE WHEN @direction = 'inbound' THEN unread_count + 1 ELSE unread_count END
            WHERE id = @conversation_id
        `).run({ conversation_id, direction });

        db.exec('COMMIT');
    } catch (txError) {
        db.exec('ROLLBACK');
        throw txError;
    }

    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

function markConversationRead(conversationId) {
    const result = db.prepare('UPDATE conversations SET unread_count = 0 WHERE id = ?').run(conversationId);
    return result.changes > 0;
}

module.exports = {
    createChannel,
    getChannel,
    listChannels,
    createContact,
    getContact,
    findContactByChannelIdentifier,
    createConversation,
    listConversations,
    getConversationDetail,
    updateConversationStatus,
    toggleFavorite,
    addMessage,
    markConversationRead,
};
