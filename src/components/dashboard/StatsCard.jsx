import Card from '../shared/Card';
import './StatsCard.css';

const StatsCard = ({ label, value, color }) => {
  return (
    <Card className="stats-card">
      <div className="stats-card-content">
        <span className="stats-card-label">{label}</span>
        <span className={`stats-card-value stats-card-value-${color}`}>{value}</span>
      </div>
    </Card>
  );
};

export default StatsCard;
