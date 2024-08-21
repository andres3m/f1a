import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3001;

if (!MONGODB_URI) {
  console.error('Error: MongoDB URI not defined in .env file');
  process.exit(1);
}

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
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

// Declare model variable
let model: any; // Use appropriate type if known

// Load the model asynchronously
const loadModel = async () => {
  try {
    const { AutoModel } = await import('@xenova/transformers');
    model = await AutoModel.from_pretrained('TheBloke/Llama-2-7B-GGUF');
    console.log('Model loaded successfully');
  } catch (error) {
    console.error('Error loading model:', error);
    process.exit(1);
  }
};

// Load the model when the server starts
loadModel();

app.post('/api/ask', async (req: Request, res: Response) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    if (!model) {
      throw new Error('Model not loaded');
    }

    // Use the model to generate a response
    const modelResponse = await model.generate({ prompt: question, max_length: 50 });
    const answer = modelResponse[0]?.generated_text || 'No response generated';

    // Save the question and response in MongoDB
    const chat = new Chat({ question, response: answer });
    await chat.save();

    // Send the response to the frontend
    res.json({ question, response: answer });
  } catch (error) {
    console.error('Error interacting with local LLM:', error);
    res.status(500).json({ error: 'Error interacting with local LLM model' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
