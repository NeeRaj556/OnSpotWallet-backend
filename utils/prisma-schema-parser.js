const fs = require('fs');
const path = require('path');

/**
 * Parse Prisma schema file and extract models
 */
function parsePrismaSchema() {
    try {
        const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');

        const models = {};
        const enums = {};

        // Extract model definitions
        const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
        let modelMatch;
        while ((modelMatch = modelRegex.exec(schemaContent))) {
            const modelName = modelMatch[1];
            const modelFields = modelMatch[2].trim();

            // Parse fields
            models[modelName] = parseModelFields(modelFields);
        }

        // Extract enum definitions
        const enumRegex = /enum\s+(\w+)\s*{([^}]*)}/g;
        let enumMatch;
        while ((enumMatch = enumRegex.exec(schemaContent))) {
            const enumName = enumMatch[1];
            const enumValues = enumMatch[2]
                .trim()
                .split(/\n/)
                .map(v => v.trim())
                .filter(Boolean);

            enums[enumName] = enumValues;
        }

        // Update model properties that reference enums
        for (const modelName in models) {
            const model = models[modelName];
            for (const fieldName in model.properties) {
                const fieldType = model.properties[fieldName].type;
                if (enums[fieldType]) {
                    model.properties[fieldName].type = 'string';
                    model.properties[fieldName].enum = enums[fieldType];
                }
            }
        }

        return models;
    } catch (error) {
        console.error('Error parsing Prisma schema:', error);
        return {};
    }
}

/**
 * Parse model fields from Prisma schema
 */
function parseModelFields(fieldsContent) {
    const lines = fieldsContent.split('\n').map(line => line.trim()).filter(Boolean);
    const properties = {};
    const required = [];

    lines.forEach(line => {
        // Skip comments and relations
        if (line.startsWith('//') || line.includes('@relation')) {
            return;
        }

        // Basic field parsing
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
            const fieldName = parts[0];
            let fieldType = parts[1];

            // Handle array types
            const isArray = fieldType.endsWith('[]');
            if (isArray) {
                fieldType = fieldType.slice(0, -2);
            }

            // Check if field is required (no ? suffix)
            const isRequired = !line.includes(fieldName + '?') && !fieldName.startsWith('@');
            if (isRequired && !fieldName.startsWith('@') && !line.includes('@default')) {
                required.push(fieldName);
            }

            // Map Prisma types to OpenAPI types
            const openApiType = mapPrismaTypeToOpenApi(fieldType);

            // Add the property if it's a regular field
            if (!fieldName.startsWith('@')) {
                properties[fieldName] = {
                    type: isArray ? 'array' : openApiType.type,
                    ...(isArray && { items: { type: openApiType.type } }),
                    ...(openApiType.format && { format: openApiType.format })
                };
            }
        }
    });

    return { properties, required };
}

/**
 * Map Prisma data types to OpenAPI data types
 */
function mapPrismaTypeToOpenApi(prismaType) {
    const typeMap = {
        'String': { type: 'string' },
        'Boolean': { type: 'boolean' },
        'Int': { type: 'integer' },
        'Float': { type: 'number' },
        'DateTime': { type: 'string', format: 'date-time' },
        'Json': { type: 'object' },
        'UUID': { type: 'string', format: 'uuid' },
        'BigInt': { type: 'integer', format: 'int64' },
        'Decimal': { type: 'number', format: 'double' },
        'Role': { type: 'string' }  // This is your enum type
    };

    return typeMap[prismaType] || { type: 'string' };
}

module.exports = parsePrismaSchema;