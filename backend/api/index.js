const app = require('../server');
const connectDB = require('../config/db');

let dbConnection = null;

module.exports = async (req, res) => {
    try {
        if (!dbConnection) {
            dbConnection = connectDB();
        }

        await dbConnection;

        return app(req, res);
    } catch (error) {
        console.error('Database connection failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Database connection failed'
        });
    }
};