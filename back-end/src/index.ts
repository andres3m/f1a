import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MongoDB URI not defined in .env file');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Conected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Schema for MongoDB
const chatSchema = new mongoose.Schema({
  question: String,
  response: String,
  createdAt: { type: Date, default: Date.now },
});

const Chat = mongoose.model('Chat', chatSchema);

// Endpoint for handle LLM calls and answers
app.post('/api/ask', async (req: Request, res: Response) => {
  const { question } = req.body;

  try {
    // Llamada al API de Replicate
    const replicateResponse = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: "latest", // La versión más reciente del modelo
        input: { prompt: question },
        model: "yorickvp/llava-13b", // Modelo específico
      },
      {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const modelOutput = replicateResponse.data.output; // Salida del modelo

    // Guardar la pregunta y respuesta en MongoDB
    const chat = new Chat({ question, response: modelOutput });
    await chat.save();

    // Enviar la respuesta al cliente
    res.json({ question, response: modelOutput });
  } catch (error) {
    console.error('Error al interactuar con Replicate:', error);
    res.status(500).json({ error: 'Error al interactuar con el modelo LLM en Replicate' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
