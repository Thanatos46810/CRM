const leadManager = require('./lead_manager');

function captureEvent(eventName, payload) {
    console.log(`Log de Sistema - Evento capturado: ${eventName}`);

    if (eventName === 'manual_event_SUBMIT_LEAD_FORM') {
        const newRecord = {
            crm_property_id: "CRM-987654321",
            client_record: {
                lead_id: `LD-${Math.floor(Math.random() * 100000)}`,
                conversion_status: "qualify_lead",
                acquisition_trigger: eventName,
                contact_data: {
                    vtp_redactEmail: false,
                    email_address: payload.email,
                    phone_number: payload.phone
                }
            },
            interaction_tracking: {
                __ccd_em_proposals_sent: 0,
                __ccd_em_meetings_held: 0,
                last_interaction: new Date().toISOString()
            }
        };

        leadManager.saveLead(newRecord);
    }
}

module.exports = { captureEvent };