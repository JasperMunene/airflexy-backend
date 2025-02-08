
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiKeyMiddleware from './middleware/apikeymiddleware.js';
import './utils/imageWorker.js';  // Start the image worker
import properties from './routes/properties.js';
import jobs from './routes/jobs.js';
import cloudinary from 'cloudinary';

// Configure Cloudinary using env variables
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    headers: true,
});

// Middleware setup
app.use(morgan('dev')); 
app.use(cors()); 
app.use(helmet()); 
app.use(express.json());
app.use(limiter);

// API Routes
app.use('/api/v1/properties', apiKeyMiddleware, properties);

// Health check route
app.get('/api/v1/health', (req, res) => {
  res.status(200).send('Server is running');
});

// Queue Status route
app.use('/api/v1/job', jobs);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
