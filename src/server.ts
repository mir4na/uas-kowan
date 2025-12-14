import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import calculatorRoutes from './routes/calculator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/calculator', calculatorRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');

    const PORT = Number(process.env.PORT) || 3000;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
