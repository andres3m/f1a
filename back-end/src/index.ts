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
    // LLM call
    const response = await axios.post('https://api.llmprovider.com/v1/chat', {
      question,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
      },
    });

    const answer = response.data.answer;

    // Save in MongoDB
    const chat = new Chat({ question, response: answer });
    await chat.save();

    res.json({ question, response: answer });
  } catch (error) {
    res.status(500).json({ error: 'Error communicting to LLM' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
