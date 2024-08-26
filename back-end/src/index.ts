import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from "url";
import path from "path";
import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";

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

// Declare model, context, and session variables
let session: LlamaChatSession | null = null;

// Load the model asynchronously
const loadModel = async () => {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    
    // Load the model
    const model = new LlamaModel({
      modelPath: path.join(__dirname, "models", "llama-2-7b.Q4_K_S.gguf")
    });

    const context = new LlamaContext({ model });
    
    // Initialize the chat session
    session = new LlamaChatSession({ context });

    console.log('Model and session loaded successfully');
  } catch (error) {
    console.error('Error loading model:', error);
    process.exit(1);
  }
};

// Load the model when the server starts
(async () => {
  await loadModel();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

app.post('/api/ask', async (req: Request, res: Response) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    if (!session) {
      return res.status(503).json({ error: 'Model not loaded yet. Please try again later.' });
    }

    // Use the session to generate a response based on the question
    console.log("User: " + question);
    
    const answer = await session.prompt(question);
    console.log(`Raw AI answer: ${answer}`);
    
    const cleanedAnswer = answer.split('\n')[0].trim();
    console.log("AI: " + cleanedAnswer);

    // Save the question and response in MongoDB
    const chat = new Chat({ question, response: cleanedAnswer, createdAt: Date.now() });
    await chat.save();
    console.log("Question/answer saved in MongoDB");
    

    // Send the response to the frontend
    res.json({ question, response: cleanedAnswer });
  } catch (error) {
    console.error('Error interacting with local LLM:', error);
    res.status(500).json({ error: 'Error interacting with local LLM model' });
  }
});