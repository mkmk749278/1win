type Props = {
  multiplier: number;
  phase: string;
};

export function MultiplierCard({ multiplier, phase }: Props) {
  return (
    <section className="panel multiplier-card">
      <p className="eyebrow">Round phase</p>
      <h2>{phase}</h2>
      <div className="multiplier-value">{multiplier.toFixed(2)}x</div>
    </section>
  );
}
