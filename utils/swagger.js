const swaggerUi = require('swagger-ui-express');
const path = require('path');
const parsePrismaSchema = require('./prisma-schema-parser');
const parseRouteComments = require('./route-comment-parser');

/**
 * Set up Swagger documentation
 */
function setupSwagger(app) {
    // Parse Prisma schema to get models
    const prismaModels = parsePrismaSchema();

    // Parse route comments
    const routesDir = path.join(__dirname, '../routes');
    const { paths, tags } = parseRouteComments(routesDir);

    // Generate schemas section from Prisma models
    const schemas = {};
    Object.keys(prismaModels).forEach(modelName => {
        const model = prismaModels[modelName];
        schemas[modelName] = {
            type: 'object',
            properties: model.properties,
            required: model.required
        };

        // Add special case for register and login
        if (modelName === 'User') {
            schemas['UserRegister'] = {
                type: 'object',
                properties: {
                    name: model.properties.name,
                    email: model.properties.email,
                    password: { type: 'string', format: 'password' }
                },
                required: ['name', 'email', 'password']
            };

            schemas['UserLogin'] = {
                type: 'object',
                properties: {
                    email: model.properties.email,
                    password: { type: 'string', format: 'password' }
                },
                required: ['email', 'password']
            };
        }
    });

    // Add AttendanceGraph schema for admin dashboard
    schemas['AttendanceGraph'] = {
        type: 'object',
        properties: {
            date: { type: 'string', format: 'date', example: '2024-06-01' },
            userId: { type: 'string', example: 'clx123...' },
            totalHours: { type: 'number', example: 7.5 }
        }
    };

    // Create tag definitions
    const tagDefinitions = tags.map(tag => ({
        name: tag,
        description: `Operations related to ${tag}`
    }));

    // Add Admin Dashboard tag if not present
    if (!tagDefinitions.find(t => t.name === 'Admin Dashboard')) {
        tagDefinitions.push({
            name: 'Admin Dashboard',
            description: 'Operations and analytics for admin dashboard (attendance graph, stats, etc)'
        });
    }

    // Add path for attendance-graph endpoint
    paths['/api/admin/attendance-graph'] = {
        get: {
            tags: ['Admin Dashboard'],
            summary: 'Get attendance graph data for staff or all staff',
            description: 'Returns an array of objects with {date, userId, totalHours} for plotting attendance graphs. Use this data in the frontend with Chart.js, ApexCharts, or similar libraries.',
            parameters: [
                {
                    name: 'staffId',
                    in: 'query',
                    required: false,
                    schema: { type: 'string' },
                    description: 'Optional staff userId to filter graph for a single staff'
                },
                {
                    name: 'from',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', format: 'date' },
                    description: 'Start date (YYYY-MM-DD)'
                },
                {
                    name: 'to',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', format: 'date' },
                    description: 'End date (YYYY-MM-DD)'
                }
            ],
            responses: {
                200: {
                    description: 'Attendance graph data',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    graph: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/AttendanceGraph' }
                                    }
                                }
                            },
                            example: {
                                graph: [
                                    { date: '2024-06-01', userId: 'clx123...', totalHours: 7.5 },
                                    { date: '2024-06-01', userId: 'clx456...', totalHours: 8 },
                                    { date: '2024-06-02', userId: 'clx123...', totalHours: 6 }
                                ]
                            }
                        }
                    }
                }
            },
            security: [{ bearerAuth: [] }]
        }
    };

    // Create OpenAPI spec
    const swaggerSpec = {
        openapi: '3.0.0',
        info: {
            title: 'Attendence API',
            version: '1.0.0',
            description: 'API documentation for the Attendence application',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3030}`,
                description: 'Development server'
            },
            {
                url: `http://localhost:${process.env.PORT || 3030}`,
                description: 'Development server'
            }
        ],
        tags: tagDefinitions,
        paths,
        components: {
            schemas,
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    };

    // Serve Swagger docs
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
 }

module.exports = setupSwagger;