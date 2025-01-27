import express from 'express';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import properties from './routes/properties.js';
import apiKeyMiddleware from './middleware/apikeymiddleware.js';

dotenv.config(); 

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
app.use(limiter)


// API Routes
app.use('/api/v1/properties', apiKeyMiddleware, properties);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('Server is running');
});


app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
