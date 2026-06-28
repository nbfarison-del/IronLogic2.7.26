export const WEIGHT_CLASSES = {
    men: ['55kg', '61kg', '67kg', '73kg', '81kg', '89kg', '96kg', '102kg', '109kg', '+109kg'],
    women: ['45kg', '49kg', '55kg', '59kg', '64kg', '71kg', '76kg', '81kg', '87kg', '+87kg']
};

export const MASTERS_AGE_GROUPS = ['35', '40', '45', '50', '55', '60', '65', '70', '75', '80', '85+'];

export const OPEN_QUALIFYING_TOTALS = {
    men: {
        '55kg': { snatch: 60, cleanJerk: 78, total: 138 },
        '61kg': { snatch: 65, cleanJerk: 85, total: 150 },
        '67kg': { snatch: 70, cleanJerk: 90, total: 160 },
        '73kg': { snatch: 73, cleanJerk: 95, total: 168 },
        '81kg': { snatch: 77, cleanJerk: 100, total: 177 },
        '89kg': { snatch: 80, cleanJerk: 105, total: 185 },
        '96kg': { snatch: 83, cleanJerk: 108, total: 191 },
        '102kg': { snatch: 85, cleanJerk: 110, total: 195 },
        '109kg': { snatch: 87, cleanJerk: 113, total: 200 },
        '+109kg': { snatch: 90, cleanJerk: 117, total: 207 }
    },
    women: {
        '45kg': { snatch: 42, cleanJerk: 55, total: 97 },
        '49kg': { snatch: 45, cleanJerk: 58, total: 103 },
        '55kg': { snatch: 48, cleanJerk: 62, total: 110 },
        '59kg': { snatch: 50, cleanJerk: 65, total: 115 },
        '64kg': { snatch: 53, cleanJerk: 68, total: 121 },
        '71kg': { snatch: 55, cleanJerk: 72, total: 127 },
        '76kg': { snatch: 58, cleanJerk: 75, total: 133 },
        '81kg': { snatch: 60, cleanJerk: 78, total: 138 },
        '87kg': { snatch: 62, cleanJerk: 80, total: 142 },
        '+87kg': { snatch: 64, cleanJerk: 83, total: 147 }
    }
};

export const MASTERS_QUALIFYING_TOTALS = {
    men: {
        '55kg': { M35: 153, M40: 144, M45: 136, M50: 127, M55: 110, M60: 101, M65: 87, M70: 74, M75: 64, M80: 54, 'M85+': 41 },
        '61kg': { M35: 165, M40: 156, M45: 147, M50: 138, M55: 119, M60: 109, M65: 94, M70: 80, M75: 70, M80: 58, 'M85+': 44 },
        '67kg': { M35: 176, M40: 166, M45: 157, M50: 147, M55: 127, M60: 116, M65: 101, M70: 86, M75: 74, M80: 62, 'M85+': 47 },
        '73kg': { M35: 186, M40: 176, M45: 165, M50: 155, M55: 134, M60: 123, M65: 106, M70: 91, M75: 79, M80: 66, 'M85+': 49 },
        '81kg': { M35: 197, M40: 186, M45: 175, M50: 164, M55: 142, M60: 130, M65: 113, M70: 96, M75: 83, M80: 69, 'M85+': 52 },
        '89kg': { M35: 207, M40: 195, M45: 184, M50: 172, M55: 149, M60: 136, M65: 118, M70: 101, M75: 87, M80: 73, 'M85+': 55 },
        '96kg': { M35: 214, M40: 202, M45: 190, M50: 178, M55: 154, M60: 141, M65: 122, M70: 104, M75: 90, M80: 75, 'M85+': 57 },
        '102kg': { M35: 219, M40: 207, M45: 195, M50: 182, M55: 158, M60: 144, M65: 125, M70: 107, M75: 92, M80: 77, 'M85+': 58 },
        '109kg': { M35: 224, M40: 211, M45: 199, M50: 187, M55: 161, M60: 148, M65: 128, M70: 109, M75: 95, M80: 79, 'M85+': 60 },
        '+109kg': { M35: 231, M40: 218, M45: 205, M50: 192, M55: 166, M60: 152, M65: 132, M70: 112, M75: 97, M80: 81, 'M85+': 61 }
    },
    women: {
        '45kg': { W35: 79, W40: 74, W45: 70, W50: 66, W55: 56, W60: 48, W65: 43, W70: 40, 'W75+': 40 },
        '49kg': { W35: 85, W40: 80, W45: 76, W50: 71, W55: 61, W60: 51, W65: 46, W70: 41, 'W75+': 40 },
        '55kg': { W35: 93, W40: 88, W45: 83, W50: 78, W55: 66, W60: 57, W65: 51, W70: 45, 'W75+': 40 },
        '59kg': { W35: 98, W40: 93, W45: 87, W50: 82, W55: 70, W60: 60, W65: 54, W70: 48, 'W75+': 41 },
        '64kg': { W35: 104, W40: 98, W45: 92, W50: 87, W55: 74, W60: 63, W65: 57, W70: 51, 'W75+': 44 },
        '71kg': { W35: 111, W40: 105, W45: 99, W50: 92, W55: 79, W60: 67, W65: 61, W70: 54, 'W75+': 47 },
        '76kg': { W35: 115, W40: 109, W45: 102, W50: 96, W55: 82, W60: 70, W65: 63, W70: 56, 'W75+': 48 },
        '81kg': { W35: 119, W40: 112, W45: 106, W50: 99, W55: 85, W60: 72, W65: 65, W70: 58, 'W75+': 50 },
        '87kg': { W35: 123, W40: 116, W45: 109, W50: 102, W55: 87, W60: 74, W65: 67, W70: 60, 'W75+': 52 },
        '+87kg': { W35: 126, W40: 119, W45: 112, W50: 105, W55: 90, W60: 77, W65: 69, W70: 61, 'W75+': 53 }
    }
};

export const getAthleteBodyWeightCategory = (bodyWeightKg, gender) => {
    const classes = WEIGHT_CLASSES[gender] || WEIGHT_CLASSES.men;
    for (const wc of classes) {
        const maxKg = parseInt(wc, 10);
        if (Number.isNaN(maxKg)) return wc;
        if (bodyWeightKg <= maxKg) return wc;
    }
    return classes[classes.length - 1];
};

export const getMastersAgeGroup = (age) => {
    if (age >= 85) return 'M85+';
    if (age >= 80) return 'M80';
    if (age >= 75) return 'M75';
    if (age >= 70) return 'M70';
    if (age >= 65) return 'M65';
    if (age >= 60) return 'M60';
    if (age >= 55) return 'M55';
    if (age >= 50) return 'M50';
    if (age >= 45) return 'M45';
    if (age >= 40) return 'M40';
    if (age >= 35) return 'M35';
    return null;
};

export const getQualifyingStatus = ({ athleteTotal, bodyWeightKg, gender, age }) => {
    const wc = getAthleteBodyWeightCategory(bodyWeightKg, gender);
    const openStandard = OPEN_QUALIFYING_TOTALS[gender]?.[wc]?.total || 0;
    const ageGroup = getMastersAgeGroup(age);
    const mastersKey = gender === 'women' ? ageGroup?.replace('M', 'W') : ageGroup;
    const mastersTable = MASTERS_QUALIFYING_TOTALS[gender]?.[wc];
    const mastersStandard = mastersTable && mastersKey ? (mastersTable[mastersKey] || mastersTable[Object.keys(mastersTable).pop()]) : 0;

    return {
        weightClass: wc,
        openTotal: openStandard,
        openQualified: athleteTotal >= openStandard,
        openPercent: openStandard ? Math.round((athleteTotal / openStandard) * 100) : 0,
        mastersAgeGroup: ageGroup,
        mastersTotal: mastersStandard,
        mastersQualified: athleteTotal >= mastersStandard,
        mastersPercent: mastersStandard ? Math.round((athleteTotal / mastersStandard) * 100) : 0
    };
};
