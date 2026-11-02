interface Props {
  titulo: string;
  valor: string | number;
  nota?: string;
}

export const Indicador: React.FC<Props> = ({ titulo, valor, nota }) => (
  <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
    <p className="text-sm text-slate-500">{titulo}</p>
    <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">{valor}</p>
    {nota && <p className="text-xs text-slate-400 mt-1">{nota}</p>}
  </div>
);
