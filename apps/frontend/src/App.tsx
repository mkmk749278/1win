import { useEffect, useMemo, useState } from 'react';
import type { PublicRoundState, SignalEvent } from '@crash/shared';
import { createCrashSocket, type SocketEnvelope } from './services/socket';
import { CrashChart } from './components/CrashChart';
import { MultiplierCard } from './components/MultiplierCard';
import { SignalPanel } from './components/SignalPanel';

type ViewState = PublicRoundState;

const initialState: ViewState = {
  roundId: 'round-0',
  phase: 'idle',
  multiplier: 1,
  crashPoint: null,
  history: [],
  signalHistory: [],
  startedAt: null,
};

export default function App() {
  const [state, setState] = useState<ViewState>(initialState);
  const [connection, setConnection] = useState('connecting');

  useEffect(() => {
    const socket = createCrashSocket((payload: SocketEnvelope) => {
      if (payload.type === 'state') {
        setState(payload.payload);
        return;
      }

      setState((current) => {
        switch (payload.type) {
          case 'round_prepare':
            return {
              ...current,
              roundId: payload.roundId,
              phase: 'preparing',
              multiplier: 1,
              history: payload.history,
              crashPoint: null,
            };
          case 'round_tick':
            return {
              ...current,
              roundId: payload.roundId,
              phase: 'live',
              multiplier: payload.multiplier,
            };
          case 'round_crash':
            return {
              ...current,
              roundId: payload.roundId,
              phase: 'crashed',
              multiplier: payload.crashAt,
              crashPoint: payload.crashAt,
              history: [...current.history, payload.crashAt].slice(-20),
            };
          case 'signal':
            return {
              ...current,
              signalHistory: [payload as SignalEvent, ...current.signalHistory].slice(0, 8),
            };
          case 'system':
            return current;
        }
      });
    });

    socket.onopen = () => setConnection('connected');
    socket.onclose = () => setConnection('disconnected');
    socket.onerror = () => setConnection('error');

    return () => socket.close();
  }, []);

  const chartPoints = useMemo(() => {
    const historyTail = state.history.slice(-10);
    return state.phase === 'live' ? [...historyTail, state.multiplier] : historyTail;
  }, [state.history, state.multiplier, state.phase]);

  return (
    <main className="app-shell">
      <header className="hero panel">
        <div>
          <p className="eyebrow">1win crash simulator</p>
          <h1>Realtime crash graph, round stream, and bot signals</h1>
        </div>
        <span className={`connection ${connection}`}>{connection}</span>
      </header>

      <section className="dashboard-grid">
        <MultiplierCard multiplier={state.multiplier} phase={state.phase} />
        <CrashChart points={chartPoints} />
        <SignalPanel signals={state.signalHistory} />
      </section>
    </main>
  );
}
