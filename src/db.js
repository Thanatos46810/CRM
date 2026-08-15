// Usa o módulo nativo node:sqlite (embutido no Node.js 22+), evitando a
// necessidade de compilar um binário nativo externo (better-sqlite3 exigia
// download de headers do Node e compilação via node-gyp).
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/crm.db');
const db = new DatabaseSync(dbPath);

// Modo WAL: melhora a integridade transacional em escritas concorrentes
// (resolve o principal risco do antigo mock_database.json)
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Criação da tabela caso ainda não exista (idempotente)
db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
        lead_id             TEXT PRIMARY KEY,
        crm_property_id     TEXT NOT NULL,
        conversion_status   TEXT NOT NULL DEFAULT 'qualify_lead',
        acquisition_trigger TEXT,
        email_address       TEXT NOT NULL,
        phone_number        TEXT NOT NULL,
        vtp_redact_email    INTEGER NOT NULL DEFAULT 0,
        proposals_sent      INTEGER NOT NULL DEFAULT 0,
        meetings_held       INTEGER NOT NULL DEFAULT 0,
        last_interaction    TEXT NOT NULL,
        created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
`);

// ---------------------------------------------------------------------------
// Schema da Inbox Omnichannel (Fase 1)
// contacts     -> pessoa física/empresa que conversa com você, independente do canal
// channels     -> instâncias de canais configurados (ex: um número de WhatsApp,
//                 uma conta do Instagram). Guarda config/tokens de integração.
// conversations-> uma "thread" entre um contato e um canal específico
// messages     -> mensagens individuais dentro de uma conversa
// tags         -> etiquetas coloridas (ex: Suporte, Implantação) aplicáveis a conversas
// ---------------------------------------------------------------------------
db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        avatar_url      TEXT,
        phone           TEXT,
        email           TEXT,
        whatsapp_id     TEXT UNIQUE,
        instagram_id    TEXT UNIQUE,
        facebook_id     TEXT UNIQUE,
        lead_id         TEXT REFERENCES leads(lead_id) ON DELETE SET NULL,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS channels (
        id              TEXT PRIMARY KEY,
        type            TEXT NOT NULL CHECK (type IN ('whatsapp','instagram','facebook','site')),
        display_name    TEXT NOT NULL,
        is_active       INTEGER NOT NULL DEFAULT 1,
        -- Config de integração (tokens, phone_number_id, page_id, etc).
        -- Guardado como JSON serializado; preenchido nas Fases 3/4.
        config_json     TEXT NOT NULL DEFAULT '{}',
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id              TEXT PRIMARY KEY,
        contact_id      TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        channel_id      TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','closed')),
        department      TEXT,
        department_color TEXT,
        is_favorite     INTEGER NOT NULL DEFAULT 0,
        last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
        unread_count    INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
        id              TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        direction       TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
        sender_name     TEXT,
        content         TEXT NOT NULL,
        message_type    TEXT NOT NULL DEFAULT 'text',
        external_id     TEXT,
        delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('pending','sent','delivered','read','failed')),
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
`);

// Migração automática, única, a partir do antigo mock_database.json (se existir e a tabela estiver vazia)
function migrateFromJsonIfNeeded() {
    const legacyPath = path.join(__dirname, '../data/mock_database.json');
    const countRow = db.prepare('SELECT COUNT(*) AS total FROM leads').get();

    if (countRow.total > 0 || !fs.existsSync(legacyPath)) {
        return;
    }

    try {
        const legacyData = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
        if (!Array.isArray(legacyData) || legacyData.length === 0) return;

        const insert = db.prepare(`
            INSERT OR IGNORE INTO leads
                (lead_id, crm_property_id, conversion_status, acquisition_trigger,
                 email_address, phone_number, vtp_redact_email, proposals_sent,
                 meetings_held, last_interaction)
            VALUES (@lead_id, @crm_property_id, @conversion_status, @acquisition_trigger,
                    @email_address, @phone_number, @vtp_redact_email, @proposals_sent,
                    @meetings_held, @last_interaction)
        `);

        db.exec('BEGIN');
        try {
            for (const record of legacyData) {
                insert.run({
                    lead_id: record.client_record.lead_id,
                    crm_property_id: record.crm_property_id,
                    conversion_status: record.client_record.conversion_status,
                    acquisition_trigger: record.client_record.acquisition_trigger,
                    email_address: record.client_record.contact_data.email_address,
                    phone_number: record.client_record.contact_data.phone_number,
                    vtp_redact_email: record.client_record.contact_data.vtp_redactEmail ? 1 : 0,
                    proposals_sent: record.interaction_tracking.__ccd_em_proposals_sent || 0,
                    meetings_held: record.interaction_tracking.__ccd_em_meetings_held || 0,
                    last_interaction: record.interaction_tracking.last_interaction,
                });
            }
            db.exec('COMMIT');
        } catch (txError) {
            db.exec('ROLLBACK');
            throw txError;
        }

        console.log(`Migração: ${legacyData.length} lead(s) importado(s) de mock_database.json para crm.db`);
    } catch (error) {
        console.error('Aviso: falha ao migrar dados legados do JSON:', error.message);
    }
}

migrateFromJsonIfNeeded();

module.exports = db;
