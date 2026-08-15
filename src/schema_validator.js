const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../data/crm_schema.json');

function validarLead(req, res, next) {
    const payload = req.body;
    
    // Leitura em tempo real do gabarito JSON
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    // O validador compara o tipo do dado recebido com o valor definido em crm_schema.json
    // Espera-se que contact_data.email_address e phone_number sejam declarados como "string"
    
    if (!payload.email || typeof payload.email !== schema.client_record.contact_data.email_address) {
        return res.status(400).json({ 
            status: "erro", 
            mensagem: "Rejeitado pela Validação: O campo 'email' é obrigatório e deve ser texto." 
        });
    }

    if (!payload.phone || typeof payload.phone !== schema.client_record.contact_data.phone_number) {
        return res.status(400).json({ 
            status: "erro", 
            mensagem: "Rejeitado pela Validação: O campo 'telefone' é obrigatório e deve ser texto." 
        });
    }

    // Se o payload for validado sem erros, repassa a execução para a rota de destino
    next();
}

module.exports = { validarLead };