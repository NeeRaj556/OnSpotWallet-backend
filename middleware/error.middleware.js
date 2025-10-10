const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Handle specific error types
    if (err.type === 'entity.parse.failed') {
        // JSON parsing error
        statusCode = 400;
        message = 'Invalid JSON format in request body';
    } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
        // JSON syntax error
        statusCode = 400;
        message = 'Invalid JSON syntax in request body';
    } else if (err.name === 'ValidationError') {
        // Validation error (from Prisma or other validation)
        statusCode = 400;
        message = 'Validation failed: ' + err.message;
    } else if (err.code === 'LIMIT_FILE_SIZE') {
        // File upload size limit
        statusCode = 413;
        message = 'File too large';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        // Unexpected file field
        statusCode = 400;
        message = 'Unexpected file field';
    }

    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        statusCode
    });

    res.status(statusCode);
    res.json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            details: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method
        })
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };