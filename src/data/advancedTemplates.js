
const beginnerPowerlifting12Week = {
    name: "Beginner Powerlifting 3-Day Peak (12 Weeks)",
    duration: "12 Weeks",
    frequency: "3 Days/Week",
    goal: "Strength/Peak",
    tags: ["Beginner", "Strength"],
    createdBy: "Iron Logic Elite",
    visibility: "public",
    weeks: Array.from({ length: 12 }, (_, i) => {
        const weekNum = i + 1;
        let intensity, phase;
        
        if (weekNum <= 4) {
            phase = "Technique & Volume";
            intensity = "RPE 6-7";
        } else if (weekNum <= 8) {
            phase = "Intensification";
            intensity = "RPE 7-8";
        } else if (weekNum <= 10) {
            phase = "Realization";
            intensity = "RPE 8-9";
        } else {
            phase = "Peak & Taper";
            intensity = "RPE 8-9 (Singles)";
        }

        return {
            weekNumber: weekNum,
            days: [
                {
                    dayOfWeek: 1,
                    name: `Day 1: Primary Squat (${phase})`,
                    exercises: [
                        { name: "Competition Back Squat", sets: weekNum > 10 ? "1" : "3", reps: weekNum > 10 ? "1" : "5", intensity: intensity, notes: "Focus on bracing" },
                        { name: "Tempo Bench Press (3-0-0)", sets: "3", reps: "6", intensity: "RPE 6", notes: "Controlled descent" },
                        { name: "Split Squats", sets: "3", reps: "10-12", intensity: "Moderate", notes: "Balance and stability" },
                        { name: "Face Pulls", sets: "3", reps: "15", intensity: "Light", notes: "Rear delt health" }
                    ]
                },
                {
                    dayOfWeek: 3,
                    name: `Day 2: Primary Deadlift (${phase})`,
                    exercises: [
                        { name: "Competition Deadlift", sets: weekNum > 10 ? "1" : "3", reps: weekNum > 10 ? "1" : "3-5", intensity: intensity, notes: "Pull slack out of bar" },
                        { name: "Close Grip Bench Press", sets: "3", reps: "8", intensity: "RPE 7", notes: "Tricep emphasis" },
                        { name: "Hamstring Curls", sets: "3", reps: "12-15", intensity: "Moderate", notes: "Controlled eccentric" },
                        { name: "Deadbugs", sets: "3", reps: "10", intensity: "Bodyweight", notes: "Core stability" }
                    ]
                },
                {
                    dayOfWeek: 5,
                    name: `Day 3: Primary Bench (${phase})`,
                    exercises: [
                        { name: "Competition Bench Press", sets: weekNum > 10 ? "1" : "3", reps: weekNum > 10 ? "1" : "5", intensity: intensity, notes: "Stay tight through legs" },
                        { name: "Paused Squat (3 sec)", sets: "3", reps: "4", intensity: "RPE 6", notes: "Pause in the hole" },
                        { name: "Lat Pulldowns", sets: "3", reps: "10", intensity: "RPE 7", notes: "Full stretch" },
                        { name: "Tricep Pushdowns", sets: "3", reps: "12", intensity: "Moderate", notes: "Lock out" }
                    ]
                }
            ]
        };
    })
};

const summerShred8Week = {
    name: "Summer Shred Powerlifting 3-Day (8 Weeks)",
    duration: "8 Weeks",
    frequency: "3 Days/Week",
    goal: "Work Capacity / Fat Loss",
    tags: ["Strength", "Fat Loss"],
    createdBy: "Iron Logic Elite",
    visibility: "public",
    weeks: Array.from({ length: 8 }, (_, i) => {
        const weekNum = i + 1;
        let mainIntensity = weekNum <= 4 ? "RPE 7" : "RPE 8";
        
        return {
            weekNumber: weekNum,
            days: [
                {
                    dayOfWeek: 1,
                    name: "Upper/Lower Density Day",
                    exercises: [
                        { name: "Back Squat", sets: "4", reps: "8", intensity: mainIntensity, notes: "60s rest" },
                        { name: "Superset: Bench Press / Barbell Row", sets: "4", reps: "10", intensity: "RPE 7", notes: "No rest between A1/A2" },
                        { name: "Lunges", sets: "3", reps: "12", intensity: "Moderate", notes: "Constant movement" },
                        { name: "Finisher: Kettlebell Swings", sets: "5", reps: "20", intensity: "High", notes: "30s rest" }
                    ]
                },
                {
                    dayOfWeek: 3,
                    name: "Full Body Circuit",
                    exercises: [
                        { name: "Deadlift", sets: "5", reps: "5", intensity: mainIntensity, notes: "Rest as needed" },
                        { name: "Superset: Overhead Press / Lat Pulldown", sets: "4", reps: "10", intensity: "RPE 7", notes: "Density focus" },
                        { name: "Goblet Squats", sets: "3", reps: "15", intensity: "Moderate", notes: "Maintain tempo" },
                        { name: "Finisher: Plank to Pushup", sets: "3", reps: "Max", intensity: "High", notes: "Core burner" }
                    ]
                },
                {
                    dayOfWeek: 5,
                    name: "Strength + Conditioning",
                    exercises: [
                        { name: "Incline Bench Press", sets: "4", reps: "8", intensity: mainIntensity, notes: "60s rest" },
                        { name: "RDL (Romanian Deadlift)", sets: "3", reps: "12", intensity: "RPE 7", notes: "Feel the stretch" },
                        { name: "Farmers Carries", sets: "4", reps: "40m", intensity: "Heavy", notes: "High intensity" },
                        { name: "Finisher: Burpees", sets: "3", reps: "60sec", intensity: "Max Effort", notes: "Heart rate up" }
                    ]
                }
            ]
        };
    })
};

const pregnancyStrength12Week = {
    name: "Pregnancy Strength 3-Day (12 Weeks)",
    duration: "12 Weeks",
    frequency: "3 Days/Week",
    goal: "Maintenance / Comfort",
    tags: ["Strength", "Pregnancy Safe"],
    createdBy: "Iron Logic Elite",
    visibility: "public",
    weeks: Array.from({ length: 12 }, (_, i) => {
        const weekNum = i + 1;
        
        return {
            weekNumber: weekNum,
            days: [
                {
                    dayOfWeek: 1,
                    name: "Lower Body Stability",
                    exercises: [
                        { name: "Goblet Squats", sets: "3", reps: "10", intensity: "RPE 5-6", notes: "Focus on breathing" },
                        { name: "Dumbbell Step-ups", sets: "3", reps: "8", intensity: "Moderate", notes: "Use support if needed" },
                        { name: "Seated Cable Rows", sets: "3", reps: "12", intensity: "RPE 6", notes: "Upright posture" },
                        { name: "Stability Ball Wall Squats", sets: "3", reps: "15", intensity: "Light", notes: "Controlled movement" }
                    ]
                },
                {
                    dayOfWeek: 3,
                    name: "Upper Body Comfort",
                    exercises: [
                        { name: "Seated Dumbbell Press", sets: "3", reps: "10", intensity: "RPE 6", notes: "Exhale on effort" },
                        { name: "Lat Pulldowns (Wide)", sets: "3", reps: "12", intensity: "RPE 6", notes: "Full range" },
                        { name: "Dumbbell Floor Press", sets: "3", reps: "10", intensity: "Moderate", notes: "Safe for late stages" },
                        { name: "Diaphragmatic Breathing", sets: "3", reps: "5 mins", intensity: "None", notes: "Relaxation focus" }
                    ]
                },
                {
                    dayOfWeek: 5,
                    name: "Full Body Mobility",
                    exercises: [
                        { name: "Sumo Kettlebell Deadlift", sets: "3", reps: "10", intensity: "RPE 6", notes: "Hinge focus" },
                        { name: "Incline Pushups", sets: "3", reps: "10-12", intensity: "RPE 5", notes: "Elevated surface" },
                        { name: "Bird Dogs", sets: "3", reps: "10", intensity: "Bodyweight", notes: "Core stability" },
                        { name: "Cat-Cow Stretch", sets: "3", reps: "10", intensity: "None", notes: "Spinal mobility" }
                    ]
                }
            ]
        };
    })
};

export const advancedTemplates = [beginnerPowerlifting12Week, summerShred8Week, pregnancyStrength12Week];
