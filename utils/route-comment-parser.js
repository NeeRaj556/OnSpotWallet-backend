const fs = require('fs');
const path = require('path');

/**
 * Parse route files for comment annotations
 */
function parseRouteComments(routesDir) {
    try {
        const routeFiles = fs.readdirSync(routesDir)
            .filter(file => file.endsWith('.js') && file !== 'router.js');

        const paths = {};
        const tags = new Set();

        routeFiles.forEach(file => {
            const filePath = path.join(routesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Match comments in the format:
            // /**
            //  * @route METHOD /path
            //  * @desc Description
            //  * @access Public|Private
            //  * @tag TagName (optional)
            //  * @body {param1, param2} (optional)
            //  */
            const commentRegex = /\/\*\*\s*\n\s*\*\s*@route\s+(GET|POST|PUT|DELETE|PATCH)\s+([^\n]+)\s*\n\s*\*\s*@desc\s+([^\n]+)\s*\n\s*\*\s*@access\s+(Public|Private)(?:\s*\n\s*\*\s*@tag\s+([^\n]+))?(?:\s*\n\s*\*\s*@body\s+{([^}]+)})?[^]*?\*\//g;

            let match;
            while ((match = commentRegex.exec(content)) !== null) {
                const method = match[1].toLowerCase();
                const route = match[2].trim();
                const description = match[3].trim();
                const access = match[4].trim();
                const tag = match[5] ? match[5].trim() : deriveTagFromRoute(route);
                const bodyParams = match[6] ? match[6].trim() : null;

                // Add tag to our set of tags
                tags.add(tag);

                if (!paths[route]) {
                    paths[route] = {};
                }

                paths[route][method] = {
                    tags: [tag],
                    summary: description,
                    description: description,
                    ...(access === 'Private' && {
                        security: [{ bearerAuth: [] }]
                    }),
                    responses: {
                        [method === 'post' ? '201' : '200']: {
                            description: 'Success response'
                        },
                        '400': { description: 'Bad request' },
                        ...(access === 'Private' && {
                            '401': { description: 'Unauthorized' }
                        }),
                        '500': { description: 'Server error' }
                    }
                };

                // Add request body for POST/PUT/PATCH methods
                if (['post', 'put', 'patch'].includes(method) && bodyParams) {
                    const params = bodyParams.split(',').map(p => p.trim());

                    paths[route][method].requestBody = {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: params.reduce((obj, param) => {
                                        obj[param] = { type: 'string' };
                                        return obj;
                                    }, {})
                                }
                            }
                        }
                    };
                }
            }
        });

        return { paths, tags: Array.from(tags) };
    } catch (error) {
        console.error('Error parsing route comments:', error);
        return { paths: {}, tags: [] };
    }
}

/**
 * Derive a tag from the route path if no tag is specified
 */
function deriveTagFromRoute(route) {
    const parts = route.split('/');
    // Return the first path segment after /api as the tag
    if (parts.length >= 2) {
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === 'api' && i + 1 < parts.length) {
                return parts[i + 1].charAt(0).toUpperCase() + parts[i + 1].slice(1);
            }
        }
    }
    return 'API';
}

module.exports = parseRouteComments;