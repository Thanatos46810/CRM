const db = require('./db');

// Converte uma linha da tabela SQLite de volta para o formato aninhado
// (client_record / interaction_tracking) usado pelo front-end e pelo event_tracker.
function toRecordShape(row) {
    return {
        crm_property_id: row.crm_property_id,
        client_record: {
            lead_id: row.lead_id,
            conversion_status: row.conversion_status,
            acquisition_trigger: row.acquisition_trigger,
            contact_data: {
                vtp_redactEmail: !!row.vtp_redact_email,
                email_address: row.email_address,
                phone_number: row.phone_number
            }
        },
        interaction_tracking: {
            __ccd_em_proposals_sent: row.proposals_sent,
            __ccd_em_meetings_held: row.meetings_held,
            last_interaction: row.last_interaction
        }
    };
}

function getLeads() {
    const rows = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    return rows.map(toRecordShape);
}

function saveLead(newLead) {
    const stmt = db.prepare(`
        INSERT INTO leads
            (lead_id, crm_property_id, conversion_status, acquisition_trigger,
             email_address, phone_number, vtp_redact_email, proposals_sent,
             meetings_held, last_interaction)
        VALUES (@lead_id, @crm_property_id, @conversion_status, @acquisition_trigger,
                @email_address, @phone_number, @vtp_redact_email, @proposals_sent,
                @meetings_held, @last_interaction)
    `);

    stmt.run({
        lead_id: newLead.client_record.lead_id,
        crm_property_id: newLead.crm_property_id,
        conversion_status: newLead.client_record.conversion_status,
        acquisition_trigger: newLead.client_record.acquisition_trigger,
        email_address: newLead.client_record.contact_data.email_address,
        phone_number: newLead.client_record.contact_data.phone_number,
        vtp_redact_email: newLead.client_record.contact_data.vtp_redactEmail ? 1 : 0,
        proposals_sent: newLead.interaction_tracking.__ccd_em_proposals_sent || 0,
        meetings_held: newLead.interaction_tracking.__ccd_em_meetings_held || 0,
        last_interaction: newLead.interaction_tracking.last_interaction,
    });

    console.log("Confirmação: Novo lead registrado com sucesso na base de dados (SQLite).");
}

function updateLeadStatus(leadId, newStatus) {
    const stmt = db.prepare(`
        UPDATE leads
        SET conversion_status = @conversion_status,
            last_interaction = @last_interaction
        WHERE lead_id = @lead_id
    `);

    const result = stmt.run({
        lead_id: leadId,
        conversion_status: newStatus,
        last_interaction: new Date().toISOString()
    });

    return result.changes > 0;
}

function deleteLead(leadId) {
    const result = db.prepare('DELETE FROM leads WHERE lead_id = ?').run(leadId);
    return result.changes > 0;
}

module.exports = { getLeads, saveLead, updateLeadStatus, deleteLead };
