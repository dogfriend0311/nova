import React, { useEffect } from 'react';
import { Flame, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DailyRewardToast = () => {
  const { dailyReward, clearDailyReward } = useAuth();

  useEffect(() => {
    if (!dailyReward) return;
    const t = setTimeout(clearDailyReward, 7000);
    return () => clearTimeout(t);
  }, [dailyReward, clearDailyReward]);

  if (!dailyReward) return null;

  return (
    <div style={{
      position: 'fixed', top: 74, right: 16, zIndex: 1500, maxWidth: 320,
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'linear-gradient(135deg, rgba(255,158,87,0.15), rgba(19,23,41,0.97))',
      border: '1px solid rgba(255,158,87,0.4)', borderRadius: 14,
      padding: '12px 14px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
      animation: 'novaToastIn 0.25s ease-out',
    }}>
      <style>{`@keyframes novaToastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'rgba(255,158,87,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Flame size={18} color="#ff9e57" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#e2e5f0' }}>
          Day {dailyReward.streak} streak! 🔥
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(158,165,196,0.65)' }}>
          +{dailyReward.coinReward} coins · +{dailyReward.xpReward} XP
        </div>
      </div>
      <button onClick={clearDailyReward} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.4)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
        <X size={15} />
      </button>
    </div>
  );
};

export default DailyRewardToast;
