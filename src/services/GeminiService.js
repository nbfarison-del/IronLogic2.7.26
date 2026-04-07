import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const genAI = new GoogleGenerativeAI(API_KEY);

const MISSING_KEY_ERROR = `
AI Chat Error: Gemini API Key missing. 

### How to fix:
1. **Local**: Ensure VITE_GEMINI_API_KEY is in your .env.local file.
2. **Production (Vercel)**: 
   - Go to your Vercel Dashboard.
   - Project Settings -> Environment Variables.
   - Add VITE_GEMINI_API_KEY with your key.
   - Trigger a new deployment.
`;

const SYSTEM_PROMPT = `
You are an expert Powerlifting Coach specializing in the "IronLogic" framework.
Your goal is to help users build highly effective, autoregulated workout programs.

### CORE PRINCIPLES OF IRONLOGIC:
1. **Autoregulation (RPE)**: Every set should have an RPE (Relative Perceived Exertion) target.
2. **Bottom-Up Periodization**: We don't guess how long a block lasts. We repeat a successful microcycle (Development Block) until it stops working.
3. **Pivot Blocks**: When progress stalls, we use a low-stress Pivot block to shed fatigue and maintain readiness.
4. **Specific Stress**: Focus on competition lifts (Squat, Bench, Deadlift) or close variations.
5. **High Frequency**: Often training competition lifts 2-4 times per week depending on recovery.

### RESPONSE FORMATTING:
- Use **Markdown** for all responses.
- Use **headings** (###) to organize long responses.
- Use **bullet points** and **numbered lists** for clarity.
- Use **bold** and *italics* to emphasize key points.
- Use **tables** for comparing stats or exercise options if requested.
- If you provide a workout program, follow the JSON format below.

### PROGRAM FORMAT REQUIREMENTS:
You MUST respond with a JSON object IF AND ONLY IF the user asks for a program. The JSON must follow this structure:
{
  "name": "Program Name",
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "dayNumber": 1, 
          "dayName": "Monday: Competition Squat",
          "exercises": [
            { "exerciseId": "bb_squat", "sets": 1, "reps": "1", "rpe": 8, "notes": "Single @8" },
            { "exerciseId": "bb_squat", "sets": 3, "reps": "5", "rpe": 7, "notes": "Back-offs @7" }
          ]
        }
      ]
    }
  ],
  "coachingNotes": "Explain the logic here."
}

**IMPORTANT**: "dayNumber" should be 1-7, where 1 is Monday and 7 is Sunday. This helps the app sync to the user's calendar.

Use these standard exercise IDs when possible: bb_squat, bb_bench, bb_deadlift, sumo_deadlift, db_press, lat_pulldown, db_row, leg_press, ssb_squat, etc.

**CUSTOM EXERCISES**: If the user needs an exercise NOT in the standard library, you MAY generate a new ID. For any such exercise, you MUST include:
- "isNew": true
- "name": "Human-readable Name"
- "category": "Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Core", or "Cardio"

### CONTEXT & FOLLOW-UPS:
- You are aware of the conversation history. Do not repeat information already given unless asked.
- Answer follow-up questions concisely and within the context of the previous discussion.
- If the user is just chatting, respond with helpful, encouraging coaching advice consistent with IronLogic principles.
`;


export const chatWithAI = async (messages, userContext = {}) => {
  if (!API_KEY) {
    throw new Error(MISSING_KEY_ERROR);
  }

  const { workouts = [], questionnaire = {}, goals = [] } = userContext;

  const contextPrompt = `
### USER CONTEXT:
- **Workout History**: ${workouts.length > 0 ? (workouts.slice(0, 5).map(w => `${w.exerciseName}: ${w.weight}${w.unit || ''}x${w.reps} @ RPE${w.rpe}`).join(', ')) : 'No history yet.'}
- **Current Goals**: ${goals.length > 0 ? goals.map(g => g.text).join(', ') : 'Not specified.'}
- **Questionnaire Profile**: ${Object.entries(questionnaire).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Not completed.'}

Please use this context to provide personalized advice. Reference their previous lifts if relevant.
    `;

  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });






  // Truncate history to avoid large context slowing down response
  let history = messages.slice(-10, -1);
  const firstUserIndex = history.findIndex(m => m.role === 'user');

  if (firstUserIndex !== -1) {
    history = history.slice(firstUserIndex);
  } else {
    history = [];
  }

  const formattedHistory = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const chat = model.startChat({
    history: formattedHistory,
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT + "\n" + contextPrompt }]
    },
  });

  const sendMessageWithTimeout = async (content, timeoutMs = 15000) => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout: AI took too long to respond.")), timeoutMs)
    );
    return Promise.race([chat.sendMessage(content), timeoutPromise]);
  };

  try {
    const result = await sendMessageWithTimeout(messages[messages.length - 1].content);
    const response = await result.response;
    return response.text();
  } catch (err) {
    const errorMsg = err.message || "";
    const isRetryable =
      errorMsg.includes('503') ||
      errorMsg.includes('529') ||
      errorMsg.includes('high demand') ||
      errorMsg.includes('too many requests') ||
      errorMsg.includes('429') ||
      errorMsg.includes('Timeout') ||
      errorMsg.includes('network') ||
      errorMsg.includes('Failed to fetch');

    if (isRetryable) {
      console.warn(`Gemini API busy or timeout (${errorMsg}). Retrying in 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Second attempt with slightly longer timeout
      try {
        const result = await sendMessageWithTimeout(messages[messages.length - 1].content, 20000);
        const response = await result.response;
        return response.text();
      } catch (retryErr) {
        throw new Error("Coach is currently overloaded. Please try again in a few minutes.");
      }
    }
    throw err;
  }
};



export const generateStrengthBlock = async (userContext, goal = 'Strength') => {
  const prompt = `
    Generate a 4-6 week ${goal} based strength block following IronLogic principles.
    The user is a powerlifter. 
    Focus on: ${goal === 'Hypertrophy' ? 'higher volume variations' : goal === 'Peaking' ? 'high intensity singles' : 'balanced volume and intensity'}.
    Please provide the response in the JSON format specified in the system prompt.
  `;
  const responseText = await chatWithAI([{ role: 'user', content: prompt }], userContext);
  return parseProgramFromResponse(responseText);
};

export const analyzeTrends = async (userContext) => {
  const prompt = `
    Analyze the user's recent workout history and provide 3-5 specific, data-driven coaching suggestions.
    Consider: 
    1. Are they overreaching? (Look at RPE trends vs intended).
    2. Are SBD maxes trending up?
    3. Suggest an exercise variation change if progress is stalled.
    Respond in a human-friendly coaching style.
  `;
  return await chatWithAI([{ role: 'user', content: prompt }], userContext);
};

export const parseProgramFromResponse = (text) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse program JSON:", e);
  }
  return null;
};
