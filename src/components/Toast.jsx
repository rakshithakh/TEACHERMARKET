import { useApp } from '../context/AppContext';

const icons = { s: '✅', e: '❌', i: 'ℹ️', w: '⚠️' };

export default function Toast() {
  const { toasts } = useApp();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <span>{icons[t.type] || '✅'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
