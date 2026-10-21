import { MousePointer2, Eraser } from "lucide-react";
import { ToolIcon } from "./ToolIcon";

export const TOOLS = [
  { id: "select", label: "Sposta", hint: "Trascina giocatori e palla. Tocca un giocatore o una linea per modificarli." },
  { id: "move", label: "Taglio", hint: "Freccia continua: trascina partendo da un giocatore per animare il suo movimento." },
  { id: "offball", label: "Senza palla", hint: "Movimento senza palla: parti da un giocatore per collegare il percorso." },
  { id: "dribble", label: "Palleggio", hint: "Penetrazione/palleggio: parti dal giocatore con palla." },
  { id: "pass", label: "Passaggio", hint: "Linea tratteggiata: dal passatore al ricevitore. La palla passerà nella fase successiva." },
  { id: "screen", label: "Blocco", hint: "Blocco: parti dal bloccante fino al punto del blocco." },
  { id: "line", label: "Linea", hint: "Linea semplice senza freccia." },
  { id: "zone", label: "Zona", hint: "Trascina per evidenziare un'area (cerchio/ellisse)." },
  { id: "zoneRect", label: "Area", hint: "Trascina per evidenziare un'area rettangolare." },
  { id: "symbol", label: "Simbolo", hint: "Tocca il campo per inserire il simbolo scelto." },
  { id: "eraser", label: "Gomma", hint: "Tocca o passa sopra una linea o un simbolo per cancellarlo." },
];

export function Toolbar({ tool, setTool }) {
  return (
    <div data-testid="editor-toolbar" className="flex landscape:flex-col gap-1 p-1.5 overflow-x-auto landscape:overflow-y-auto no-scrollbar bg-[#0E1522] border-[#1E293B] portrait:border-t landscape:border-r shrink-0">
      {TOOLS.map((t) => {
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            data-testid={`tool-${t.id}`}
            title={t.label}
            onClick={() => setTool(t.id)}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] h-[50px] landscape:w-[58px] landscape:h-[48px] rounded-xl transition-colors duration-150 ${active ? "bg-amber-500 text-[#090D14]" : "text-slate-300 hover:bg-[#1A263D]"}`}
          >
            {t.id === "select" ? <MousePointer2 className="w-5 h-5" /> : t.id === "eraser" ? <Eraser className="w-5 h-5" /> : <ToolIcon type={t.id} />}
            <span className="text-[9.5px] font-semibold leading-none whitespace-nowrap">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
