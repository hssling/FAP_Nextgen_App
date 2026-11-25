import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import { fetchPendingReflectionCount } from '../services/mentorNotifications';

export function usePendingReflections(teacherId) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (!teacherId || !supabase) return undefined;
    let active = true;
    let previous = null;
    let loading = false;
    const refresh = async () => {
      if (loading) return;
      loading = true;
      try {
        const next = await fetchPendingReflectionCount(supabase, teacherId);
        if (!active) return;
        if (previous !== null && next !== previous) {
          if (next > previous) toast.success('New reflection awaiting review');
          window.dispatchEvent(new Event('fap-reflections-changed'));
        }
        previous = next;
        setCount(next);
      } catch (error) {
        console.warn('Could not refresh pending reflections:', error.message);
      } finally { loading = false; }
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    window.addEventListener('fap-reflection-graded', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('fap-reflection-graded', refresh); };
  }, [teacherId]);
  return count;
}
