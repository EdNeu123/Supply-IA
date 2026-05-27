export const Semaforo = ({ status }: { status: 'ok' | 'alerta' | 'critico' }) => {
  const styles = { ok: 'bg-green-bg text-green', alerta: 'bg-yellow-bg text-yellow', critico: 'bg-red-bg text-red' };
  const labels = { ok: 'Normal', alerta: 'Atenção', critico: 'Crítico' };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${styles[status] || styles.ok}`}>
      {labels[status] || 'Normal'}
    </span>
  );
};
