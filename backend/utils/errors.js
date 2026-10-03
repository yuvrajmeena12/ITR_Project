class ApiError extends Error {
  constructor(status, message, { code, fields } = {}) {
    super(message);
    this.status = status;
    this.code = code || null;
    this.fields = fields || null;
  }
}

const badRequest = (message, fields) => new ApiError(400, message, { code: 'VALIDATION', fields });
const unauthorized = (message = 'Please sign in to continue') => new ApiError(401, message, { code: 'UNAUTHORIZED' });
const forbidden = (message = 'You are not allowed to do that') => new ApiError(403, message, { code: 'FORBIDDEN' });
const notFound = (message = 'Not found') => new ApiError(404, message, { code: 'NOT_FOUND' });
const conflict = (message) => new ApiError(409, message, { code: 'CONFLICT' });

module.exports = { ApiError, badRequest, unauthorized, forbidden, notFound, conflict };
