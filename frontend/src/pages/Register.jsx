import { useNavigate } from 'react-router-dom';
import DailyForm from '../components/DailyForm';

export default function Register() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Registrar o dia</h1>
      <DailyForm onSuccess={() => navigate('/')} />
    </div>
  );
}
