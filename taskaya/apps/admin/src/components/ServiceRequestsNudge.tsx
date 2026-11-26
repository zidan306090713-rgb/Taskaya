import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Ico } from './Ico';
import { useAuth } from '../lib/auth';
import { countServiceRequests } from '../lib/serviceRequests';

// سطر في "محتاج تحرّك" بالرئيسية: عدد طلبات الخدمات المستنية مراجعة
export default function ServiceRequestsNudge() {
  const nav = useNavigate();
  const allowed = useAuth().can('providers');
  const { data: n } = useQuery({ queryKey: ['service-requests-count'], queryFn: countServiceRequests, enabled: allowed });
  if (!allowed || !n) return null;
  return (
    <button className="sr-nudge" onClick={() => nav('/providers?tab=services')}>
      <span className="sr-nudge-ic"><Ico e="⏳" /></span>
      <span><b>{n} {n === 1 ? 'طلب خدمة' : 'طلبات خدمات'}</b> مستنية مراجعة</span>
      <span className="muted small">مراجعة ←</span>
    </button>
  );
}
