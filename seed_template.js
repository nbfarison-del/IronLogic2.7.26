import { db } from './src/config/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

const seedTemplates = async () => {
    const templatesRef = collection(db, 'program_templates');
    
    const beginnerProgram = {
        name: "12-Week Beginner Powerlifting Program (3-Day)",
        duration: "12 Weeks",
        frequency: "3 Days/Week",
        goal: "Beginner Powerlifting",
        createdBy: "Iron Logic",
        visibility: "public",
        isDefault: true,
        weeks: []
    };

    // Generate 12 weeks of programming
    for (let w = 1; w <= 12; w++) {
        const week = {
            weekNumber: w,
            days: []
        };

        // Phase 1 (1-4), Phase 2 (5-8), Phase 3 (9-11), Week 12 (Test)
        let intensity, reps, sets;
        if (w <= 4) {
            intensity = 'RPE 6-7';
            reps = 6;
            sets = '3-4';
        } else if (w <= 8) {
            intensity = 'RPE 7-8';
            reps = 5;
            sets = '1x5 @ RPE 8, then 3x5 @ -10%';
        } else if (w <= 11) {
            intensity = 'RPE 8-9';
            reps = 3;
            sets = '1x1 @ RPE 8, then 3x3 @ RPE 7';
        } else {
            intensity = 'RPE 9-10';
            reps = 1;
            sets = 'Max Attempt';
        }

        // Day 1: Squat + Bench
        week.days.push({
            dayOfWeek: 1,
            name: "Squat + Bench",
            exercises: [
                { name: "Back Squat", sets: sets, reps: reps, intensity: intensity, notes: "Focus on movement quality" },
                { name: "Competition Bench Press", sets: sets, reps: reps, intensity: intensity, notes: "Keep elbows tucked" },
                { name: "Chest Supported Row", sets: "3", reps: "8-10", intensity: "Moderate", notes: "Strict form" }
            ]
        });

        // Day 2: Deadlift + Upper Accessories
        week.days.push({
            dayOfWeek: 3,
            name: "Deadlift + Accessories",
            exercises: [
                { name: "Deadlift", sets: sets, reps: reps, intensity: intensity, notes: "Neutral spine" },
                { name: "Overhead Press", sets: "3", reps: "8", intensity: "Moderate", notes: "Lock out at top" },
                { name: "Lat Pulldown", sets: "3", reps: "10-12", intensity: "Moderate", notes: "Feel the lats" }
            ]
        });

        // Day 3: Bench + Secondary Lower
        week.days.push({
            dayOfWeek: 5,
            name: "Bench + Secondary Lower",
            exercises: [
                { name: "Pause Bench Press", sets: sets, reps: reps, intensity: intensity, notes: "2 second pause" },
                { name: "Pause Squat", sets: "3", reps: "5", intensity: "RPE 6", notes: "Stay tight in the hole" },
                { name: "Romanian Deadlift", sets: "3", reps: "8", intensity: "Moderate", notes: "Stretch the hamstrings" }
            ]
        });

        beginnerProgram.weeks.push(week);
    }

    try {
        await addDoc(templatesRef, beginnerProgram);
        console.log("Successfully seeded beginner program template!");
    } catch (error) {
        console.error("Error seeding template:", error);
    }
};

seedTemplates();
