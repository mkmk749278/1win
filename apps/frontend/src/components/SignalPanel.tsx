import type { SignalEvent } from '@crash/shared';

type Props = {
  signals: SignalEvent[];
};

export function SignalPanel({ signals }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Signals</h3>
        <span>{signals.length} recent</span>
      </div>
      <ul className="signal-list">
        {signals.length === 0 ? <li>No signals yet.</li> : null}
        {signals.map((signal) => (
          <li key={`${signal.roundId}-${signal.signal}`} className={`signal ${signal.level}`}>
            <strong>{signal.level.toUpperCase()}</strong>
            <span>{signal.signal}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
