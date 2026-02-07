# AI Coaching Feature - Implementation Plan

## Overview
Add a premium tier feature that generates personalized workout programs using AI based on user questionnaires, with trainer review/approval before delivery to users.

## Feature Description
- Users complete a 5-10 question fitness questionnaire
- AI generates a personalized workout program based on responses
- You (trainer) review and approve/modify the program in an admin dashboard
- Approved program is delivered to the user's account and populated in their ProgramPlanner

## Business Value
- Creates a **premium tier** revenue stream
- Scales your coaching expertise with AI assistance
- Maintains quality control through manual review
- Differentiates app from competitors

---

## Prerequisites (Current App Assessment)

### ✅ Already Have
- User authentication system (`AuthContext.jsx`)
- Program planning UI (`ProgramPlanner.jsx`)
- Exercise database (`data/exercises.js`)
- React Router for navigation
- localStorage for client-side data

### ⚠️ Need to Add
- **Backend server** (Node.js/Express, Firebase, or Supabase)
- **Database** (user tiers, questionnaires, programs, review status)
- **AI API integration** (OpenAI, Anthropic Claude, or Google Gemini)
- **Admin authentication** (separate from regular users)
- **Payment processing** (Stripe for premium tier subscriptions)

---

## Implementation Phases

### Phase 1: Backend Infrastructure (2-3 weeks)

#### Setup Backend
1. **Choose backend solution:**
   - Option A: **Firebase** (quickest, managed backend)
   - Option B: **Supabase** (open-source, PostgreSQL)
   - Option C: **Custom Node.js/Express** (most flexible)

2. **Database schema:**
   ```
   Users Table:
   - id, email, password_hash, tier (free/premium/elite), created_at
   
   Questionnaires Table:
   - id, user_id, responses (JSON), submitted_at, status (pending/reviewed)
   
   Programs Table:
   - id, user_id, questionnaire_id, ai_generated_program (JSON), 
     reviewed_program (JSON), status (pending/approved/rejected), 
     reviewer_notes, created_at, approved_at
   
   Admin_Users Table:
   - id, email, password_hash, role (admin/trainer)
   ```

3. **API Endpoints:**
   - `POST /api/questionnaire` - Submit questionnaire
   - `GET /api/programs/pending` - Get programs awaiting review (admin)
   - `PUT /api/programs/:id/review` - Submit review/approval (admin)
   - `GET /api/programs/user/:userId` - Get user's approved programs
   - `POST /api/upgrade-tier` - Handle premium tier upgrade

#### Update AuthContext
- Modify to use backend authentication instead of localStorage
- Add user tier tracking (`user.tier`)
- Add role-based access (regular user vs admin)

---

### Phase 2: User Questionnaire System (1 week)

#### Create Components
1. **`src/pages/PremiumUpgrade.jsx`**
   - Marketing page for premium tier
   - "Get AI Coaching" CTA button

2. **`src/pages/Questionnaire.jsx`**
   - Multi-step form component
   - Progress indicator
   - Form validation

3. **Sample Questions:**
   ```javascript
   const questions = [
     { id: 'age', type: 'number', label: 'What is your age?', required: true },
     { id: 'experience', type: 'select', label: 'Training experience?', 
       options: ['Beginner', 'Intermediate', 'Advanced'] },
     { id: 'goal', type: 'multi-select', label: 'Primary goals?',
       options: ['Strength', 'Hypertrophy', 'Weight Loss', 'Athletic Performance', 'General Fitness'] },
     { id: 'frequency', type: 'number', label: 'Days per week available?', min: 1, max: 7 },
     { id: 'duration', type: 'number', label: 'Minutes per session?', min: 15, max: 180 },
     { id: 'equipment', type: 'multi-select', label: 'Available equipment?',
       options: ['Full Gym', 'Dumbbells', 'Barbell', 'Bodyweight Only', 'Resistance Bands'] },
     { id: 'injuries', type: 'textarea', label: 'Any injuries or limitations?', required: false },
     { id: 'preferences', type: 'textarea', label: 'Exercise preferences or dislikes?', required: false },
   ]
   ```

4. **Add route to `App.jsx`:**
   ```jsx
   <Route path="/questionnaire" element={
     <ProtectedRoute requiresPremium={true}>
       <Questionnaire />
     </ProtectedRoute>
   } />
   ```

---

### Phase 3: AI Integration (1-2 weeks)

#### Setup AI Service
1. **Create `src/services/aiService.js`:**
   ```javascript
   // Backend service (not client-side)
   import OpenAI from 'openai'; // or Anthropic, Google AI
   
   export async function generateProgram(questionnaireData) {
     const prompt = buildPrompt(questionnaireData);
     const response = await openai.chat.completions.create({
       model: "gpt-4",
       messages: [
         { role: "system", content: "You are an expert fitness coach..." },
         { role: "user", content: prompt }
       ],
       response_format: { type: "json_object" }
     });
     return JSON.parse(response.choices[0].message.content);
   }
   ```

2. **Prompt Engineering:**
   - Include questionnaire responses
   - Request structured JSON output matching your program format
   - Specify sets, reps, RPE, exercise selection
   - Request 4-12 week progressive program
   - Include coaching cues and form tips

3. **Expected AI Output Format:**
   ```json
   {
     "programName": "Intermediate Strength Builder",
     "duration": "8 weeks",
     "weeks": [
       {
         "weekNumber": 1,
         "sessions": [
           {
             "day": "Monday",
             "focus": "Upper Push",
             "exercises": [
               {
                 "name": "Bench Press",
                 "sets": 4,
                 "reps": "6-8",
                 "rpe": 8,
                 "notes": "Focus on controlled descent"
               }
             ]
           }
         ]
       }
     ],
     "notes": "This program focuses on..."
   }
   ```

---

### Phase 4: Admin Review Dashboard (1-2 weeks)

#### Create Admin Interface
1. **`src/pages/AdminDashboard.jsx`**
   - List of pending programs
   - Filter by status (pending/approved/rejected)
   - Click to review individual program

2. **`src/pages/ProgramReview.jsx`**
   - Display questionnaire responses
   - Show AI-generated program in editable format
   - Inline editing capabilities
   - Approve/Reject/Request Regeneration buttons
   - Add trainer notes field
   - Preview how it will look to user

3. **Add admin routes:**
   ```jsx
   <Route path="/admin/dashboard" element={
     <AdminRoute>
       <AdminDashboard />
     </AdminRoute>
   } />
   <Route path="/admin/review/:programId" element={
     <AdminRoute>
       <ProgramReview />
     </AdminRoute>
   } />
   ```

4. **Admin navigation:**
   - Add admin menu item in `Navbar.jsx` (conditional on admin role)

---

### Phase 5: User Program Delivery (1 week)

#### Program Display & Management
1. **Update `src/pages/Home.jsx`:**
   - Show "Your AI Program" card if user has approved program
   - Button to view/start program

2. **Create `src/pages/MyProgram.jsx`:**
   - Display approved program details
   - Week-by-week breakdown
   - Button to "Load into Planner"
   - Progress tracking

3. **Update `ProgramPlanner.jsx`:**
   - Add "Load AI Program" option
   - Import approved program data
   - Pre-populate exercises, sets, reps

4. **Integration with WorkoutLog:**
   - Link planned workouts to actual logged workouts
   - Track adherence to program

---

### Phase 6: Payment & Tier System (1-2 weeks)

#### Subscription Management
1. **Integrate Stripe:**
   ```bash
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

2. **Create pricing tiers:**
   - Free: Manual planning & logging
   - Premium ($9.99/mo): AI program generation + review
   - Elite ($19.99/mo): Monthly check-ins + program updates

3. **`src/pages/Billing.jsx`:**
   - Display current tier
   - Upgrade/downgrade options
   - Billing history
   - Cancel subscription

4. **Backend webhook:**
   - Handle Stripe webhooks for subscription events
   - Update user tier in database

---

## Technical Stack Summary

### Frontend (Already Have)
- React 19.2.0
- React Router DOM
- Vite

### Backend (Need to Add)
Choose one:
- **Firebase** (easiest): Authentication, Firestore, Cloud Functions
- **Supabase** (modern): PostgreSQL, Auth, Realtime, Edge Functions
- **Custom**: Node.js + Express + PostgreSQL/MongoDB

### AI Provider (Choose One)
- **OpenAI GPT-4**: $0.01-0.03 per program, most flexible
- **Anthropic Claude**: $0.01-0.02 per program, excellent reasoning
- **Google Gemini**: $0.001-0.01 per program, most cost-effective

### Payment Processing
- **Stripe**: Industry standard, easy integration

---

## Cost Estimates (Monthly at 100 Users)

### AI Program Generation
- 20 new programs/month × $0.02 = **$0.40**

### Backend Hosting
- Firebase/Supabase free tier → **$0** (initially)
- Heroku/Railway/Render: **$5-10**
- VPS (DigitalOcean): **$6**

### Database
- Firebase: Free tier → **$0** (initially)
- Supabase: Free tier → **$0** (initially)

### Stripe Fees
- 2.9% + $0.30 per transaction
- 50 subscribers × $9.99 = $499.50 revenue
- Stripe takes ~$17 → **$17**

**Total Monthly Cost: ~$20-30** (before scaling)

---

## Security Considerations

### Must Implement
- ✅ HTTPS everywhere
- ✅ Password hashing (bcrypt/argon2)
- ✅ JWT tokens for auth (with expiration)
- ✅ Rate limiting on API endpoints
- ✅ Input validation/sanitization
- ✅ CORS configuration
- ✅ Environment variables for API keys
- ✅ Role-based access control (user vs admin)

### Privacy & Compliance
- Clear privacy policy about AI usage
- User consent for data processing
- Option to delete questionnaire data
- GDPR compliance (if EU users)
- Consider HIPAA if storing health data

---

## Testing Strategy

### Before Launch
1. **AI Output Testing:**
   - Test 20+ different questionnaire combinations
   - Verify program quality and variety
   - Ensure proper JSON format

2. **Manual Review Flow:**
   - Test admin dashboard with mock data
   - Verify edit/approve/reject flows
   - Test notification system

3. **User Experience:**
   - Complete questionnaire as test user
   - Receive and use generated program
   - Log workouts from AI program

4. **Payment Flow:**
   - Test Stripe integration in test mode
   - Verify tier upgrades/downgrades
   - Test subscription cancellation

---

## Launch Checklist

- [ ] Backend deployed and tested
- [ ] Database schema finalized
- [ ] AI integration working reliably
- [ ] Admin dashboard functional
- [ ] Payment processing configured
- [ ] Legal pages updated (Terms, Privacy)
- [ ] Beta testing with 5-10 users completed
- [ ] Email notifications setup
- [ ] Error monitoring (Sentry or similar)
- [ ] Analytics tracking (Google Analytics or Mixpanel)

---

## Future Enhancements (Post-Launch)

### V2 Features
- Monthly program updates based on progress
- Direct messaging between user and trainer
- Video exercise library integration
- Nutrition guidance integration
- Community features (premium user forum)

### Advanced AI Features
- Automatic program adjustments based on logged workouts
- Deload week detection
- Injury prevention alerts
- Real-time form check using computer vision

---

## Questions for Future Implementation

Before starting, decide:
1. Which backend solution? (Firebase recommended for speed)
2. Which AI provider? (OpenAI recommended for quality)
3. Pricing structure? (Suggest $9.99/month premium tier)
4. Review turnaround time? (Promise 24-48 hour review)
5. Program regeneration limit? (Suggest 1 free regeneration, then charges apply)

---

## File Structure (New Files Needed)

```
src/
├── pages/
│   ├── PremiumUpgrade.jsx        [NEW]
│   ├── Questionnaire.jsx         [NEW]
│   ├── MyProgram.jsx              [NEW]
│   ├── AdminDashboard.jsx        [NEW]
│   ├── ProgramReview.jsx         [NEW]
│   └── Billing.jsx               [NEW]
├── components/
│   ├── SubscriptionCard.jsx      [NEW]
│   └── ProgramCard.jsx           [NEW]
├── services/
│   ├── apiService.js             [NEW] - Backend API calls
│   └── stripeService.js          [NEW] - Payment handling
├── context/
│   └── SubscriptionContext.jsx   [NEW] - Track user tier
└── utils/
    └── programMapper.js          [NEW] - Map AI output to app format

backend/ (new directory)
├── server.js
├── routes/
│   ├── auth.js
│   ├── questionnaire.js
│   ├── programs.js
│   └── admin.js
├── services/
│   └── aiService.js
└── middleware/
    ├── auth.js
    └── adminAuth.js
```

---

## When to Start

**Recommended**: After current bug fixes are complete and app is stable. This is a major feature requiring 6-8 weeks of focused development.

**Quick Win Alternative**: Start with just the questionnaire UI and manual program creation (no AI) to validate user interest, then add AI later.
