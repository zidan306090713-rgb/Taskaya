// هيكل رمادي بيلمع مكان البيانات لحد ما توصل (بدل "جاري التحميل…")
type Kind = 'list' | 'table' | 'cards' | 'kpis' | 'page';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function Skeleton({ kind = 'list', rows = 5 }: { kind?: Kind; rows?: number }) {
  if (kind === 'cards') {
    return (
      <div className="pgrid" aria-busy="true">
        {range(6).map((i) => (
          <div key={i} className="card sk-card">
            <div className="sk sk-cover" />
            <div className="sk sk-avatar" />
            <div className="sk sk-line w60" />
            <div className="sk sk-line w40" />
            <div className="sk-pills"><div className="sk sk-pill" /><div className="sk sk-pill" /></div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'kpis') {
    return (
      <div className="sk-kpis" aria-busy="true">
        {range(4).map((i) => (
          <div key={i} className="card">
            <div className="sk sk-line w40" />
            <div className="sk sk-big" />
            <div className="sk sk-line w60" />
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'table') {
    return (
      <div className="card" aria-busy="true">
        {range(rows).map((i) => (
          <div key={i} className="sk-row">
            <div className="sk sk-line w80" />
            <div className="sk sk-line w60" />
            <div className="sk sk-pill" />
            <div className="sk sk-line w50" />
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'page') {
    return (
      <div aria-busy="true">
        <div className="sk sk-title" />
        <Skeleton kind="kpis" />
        <Skeleton kind="table" rows={4} />
      </div>
    );
  }
  return (
    <div className="card" aria-busy="true">
      {range(rows).map((i) => (
        <div key={i} className="sk-item">
          <div className="sk sk-avatar sm" />
          <div className="sk-col">
            <div className="sk sk-line w50" />
            <div className="sk sk-line w80" />
          </div>
        </div>
      ))}
    </div>
  );
}
