import { PersonStanding, StretchHorizontal, Rocket, Flower2, Footprints, Waves } from 'lucide-react';

const MAP = {
    person: PersonStanding,   // Traditional
    stretch: StretchHorizontal, // IronLogic General
    rocket: Rocket,           // Jump Training
    flower: Flower2,          // Maternal Prep
    run: Footprints,          // Run Prep
    waves: Waves,             // Cardio Recovery
};

/** Renders the Lucide icon for a mobility path icon key. */
export const PathIcon = ({ icon, size = 20, style, ...props }) => {
    const C = MAP[icon] || StretchHorizontal;
    return <C size={size} style={{ verticalAlign: '-4px', ...style }} {...props} />;
};

export default PathIcon;
