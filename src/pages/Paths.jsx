import MobilityTab from '../components/MobilityTab';
import { useMobilityRx } from '../hooks/useMobilityRx';

/** Full mobility path library + session player. */
const Paths = () => {
    const { prescription } = useMobilityRx();
    return (
        <div className="page-container">
            <MobilityTab prescription={prescription} />
        </div>
    );
};

export default Paths;
