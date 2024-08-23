import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from "url";
import path from "path";
import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";
import axios from 'axios';  // Import axios for HTTP requests

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
      modelPath: path.join(__dirname, "models", "Llama-2-7b-chat-hf-GGUF-Q4_K_M.gguf ") // Make sure this path is correct
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

// Helper function to fetch data from the API
const fetchRaceData = async () => {
  const carDataUrl = 'https://api.openf1.org/v1/car_data?driver_number=55&session_key=9159&speed%3E=315';
  const sessionsUrl = 'https://api.openf1.org/v1/sessions?country_name=Belgium&session_name=Sprint&year=2023';
  const driversUrl = 'https://api.openf1.org/v1/drivers?driver_number=1&session_key=9158';
  const stintsUrl = 'https://api.openf1.org/v1/stints?session_key=9165&tyre_age_at_start%3E=3';
  const weatherUrl = 'https://api.openf1.org/v1/weather?meeting_key=1208&wind_direction%3E=130&track_temperature%3E=52';


  try {
    const [carData, sessions, drivers, stints, weather] = await Promise.all([
      axios.get(carDataUrl),
      axios.get(sessionsUrl),
      axios.get(driversUrl),
      axios.get(stintsUrl),
      axios.get(weatherUrl)

    ]);

    console.log(carData.data);
    console.log(sessions.data);
    console.log(drivers.data);
    console.log(stints.data);
    console.log(weather.data);

    return { carData: carData.data, sessions: sessions.data, drivers: drivers.data, stints: stints.data, weather: weather.data };
    
  } catch (error) {
    console.error('Error fetching race data:', error);
    throw new Error('Failed to fetch race data');
  }
};
// Function to enrich the question with race data if needed
const enrichQuestionWithRaceData = async (question: string) => {
  const keywords = ["Track Temperature", "Tyre age at start", "Expected Rain"];
  const includesKeyword = keywords.some(keyword => question.includes(keyword));

  if (includesKeyword) {
    const raceData = await fetchRaceData();
    let enrichedQuestion = question;

    // Ensure that weather data is correctly accessed from the first element of the array
    const weatherData = raceData.weather[0]; // Access the first element in the array

    if (question.includes("Track Temperature")) {
      const trackTemperature = weatherData?.track_temperature || 'not available';
      enrichedQuestion += `\n\nTrack Temperature: ${trackTemperature}`;
    }
    if (question.includes("Tyre age at start")) {
      const tyreAgeAtStart = raceData.stints[0]?.tyre_age_at_start || 'not available'; // Handle array indexing correctly
      enrichedQuestion += `\n\nTyre age at start: ${tyreAgeAtStart}`;
    }
    if (question.includes("Expected Rain")) {
      const expectedRain = weatherData?.rainfall || 'not available';
      enrichedQuestion += `\n\nExpected Rain: ${expectedRain}`;
    }

    return enrichedQuestion;
  }

  return question;
};


// Endpoint to handle the race strategy question
app.post('/api/ask', async (req: Request, res: Response) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    if (!session) {
      return res.status(503).json({ error: 'Model not loaded yet. Please try again later.' });
    }

    // Enrich the question with race data if necessary
    const enrichedQuestion = await enrichQuestionWithRaceData(question);

    // Use the session to generate a response based on the enriched question
    console.log("User: " + enrichedQuestion);
    
    const answer = await session.prompt(enrichedQuestion);
    console.log(`Raw AI answer: ${answer}`);
    
    // Remove exact original question string from the answer and trim extra new lines
    let cleanedAnswer = answer.replace(question, '').trim();
    
    // Remove leading/trailing new lines and extra line breaks
    cleanedAnswer = cleanedAnswer.replace(/^\n+|\n+$/g, '').replace(/\n\s*\n/g, '\n');
    
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
