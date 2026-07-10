/**
 * Wektorowe ilustracje dań (widok z góry) — spójny, stonowany styl.
 * Używane, dopóki produkt nie ma prawdziwego zdjęcia (imageUrl z Dotykački);
 * gdy zdjęcie jest, karta pokazuje zdjęcie zamiast ilustracji.
 */

export type DishKind =
  | "margherita"
  | "capricciosa"
  | "diavola"
  | "hawajska"
  | "formaggi"
  | "wiejska"
  | "cola"
  | "sok"
  | "woda"
  | "tiramisu"
  | "pannacotta"
  | "generic";

export function dishKindFor(name: string): DishKind {
  const s = name.toLowerCase();
  if (s.includes("margherita")) return "margherita";
  if (s.includes("capricciosa")) return "capricciosa";
  if (s.includes("diavola")) return "diavola";
  if (s.includes("hawaj")) return "hawajska";
  if (s.includes("formaggi")) return "formaggi";
  if (s.includes("wiejska")) return "wiejska";
  if (s.includes("cola")) return "cola";
  if (s.includes("sok")) return "sok";
  if (s.includes("woda")) return "woda";
  if (s.includes("tiramisu")) return "tiramisu";
  if (s.includes("panna")) return "pannacotta";
  return "generic";
}

/* Baza pizzy: talerz, ciasto, sos, ser + delikatne cięcia. */
function PizzaBase({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <ellipse cx="100" cy="108" rx="86" ry="14" fill="#000" opacity=".06" />
      <circle cx="100" cy="100" r="88" fill="#FFFFFF" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#E8E0D2" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="74" fill="#E3B172" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="#D19E55" strokeWidth="3" opacity=".55" />
      <circle cx="100" cy="100" r="62" fill="#C6503C" />
      <circle cx="100" cy="100" r="58" fill="#F3DCA4" />
      {/* nieregularność sera */}
      <circle cx="72" cy="82" r="10" fill="#F3DCA4" />
      <circle cx="132" cy="120" r="9" fill="#F3DCA4" />
      <circle cx="118" cy="66" r="7" fill="#EFD497" />
      <circle cx="76" cy="128" r="8" fill="#EFD497" />
      {children}
      {/* cięcia */}
      <g stroke="#7A5B2E" strokeWidth="1" opacity=".12">
        <line x1="100" y1="30" x2="100" y2="170" />
        <line x1="40" y1="65" x2="160" y2="135" />
        <line x1="40" y1="135" x2="160" y2="65" />
      </g>
      {/* światło */}
      <path d="M45 60 A70 70 0 0 1 100 30" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".25" />
    </>
  );
}

function Basil({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse cx="-3" cy="0" rx="6" ry="3.4" fill="#5C7A45" />
      <ellipse cx="4" cy="-2" rx="6" ry="3.4" fill="#6B8A52" transform="rotate(40)" />
    </g>
  );
}

function Salami({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9.5" fill="#A63428" />
      <circle cx={x} cy={y} r="9.5" fill="none" stroke="#8C2A20" strokeWidth="1.5" />
      <circle cx={x - 3} cy={y - 2} r="1.4" fill="#D8907F" />
      <circle cx={x + 3} cy={y + 3} r="1.2" fill="#D8907F" />
      <circle cx={x + 2} cy={y - 4} r="1" fill="#D8907F" />
    </g>
  );
}

function Mushroom({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M-7 2 Q-7 -6 0 -6 Q7 -6 7 2 Z" fill="#EDE3D3" stroke="#CBB89B" strokeWidth="1" />
      <rect x="-2" y="2" width="4" height="5" rx="1.5" fill="#DCCBB0" />
    </g>
  );
}

function Ham({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${r})`}
      d="M-8 -5 Q0 -9 8 -5 Q9 0 6 6 Q0 9 -6 5 Q-9 0 -8 -5 Z"
      fill="#DE8E7E"
      stroke="#C97A6B"
      strokeWidth="1"
    />
  );
}

function Pineapple({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${r})`}
      d="M-7 -6 L7 -6 Q5 0 7 6 L-7 6 Q-5 0 -7 -6 Z"
      fill="#F2C94C"
      stroke="#DDB13A"
      strokeWidth="1"
    />
  );
}

function Bacon({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-9" y="-4" width="18" height="8" rx="3" fill="#B0604A" />
      <path d="M-7 0 H7" stroke="#E0A48F" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function CheesePatch({ x, y, c }: { x: number; y: number; c: string }) {
  return <circle cx={x} cy={y} r="11" fill={c} opacity=".85" />;
}

/* Napoje: szklanka z boku, minimalistycznie */
function Glass({ liquid, light }: { liquid: string; light: string }) {
  return (
    <>
      <ellipse cx="100" cy="168" rx="46" ry="9" fill="#000" opacity=".06" />
      <path d="M68 42 L76 164 Q77 170 84 170 L116 170 Q123 170 124 164 L132 42 Z" fill="#FFFFFF" opacity=".9" />
      <path d="M72 62 L79 160 Q80 165 86 165 L114 165 Q120 165 121 160 L128 62 Z" fill={liquid} />
      <path d="M74 62 L80 120 L120 120 L126 62 Z" fill={light} opacity=".35" />
      {/* lód */}
      <rect x="84" y="74" width="14" height="14" rx="3" fill="#fff" opacity=".5" transform="rotate(12 91 81)" />
      <rect x="104" y="96" width="12" height="12" rx="3" fill="#fff" opacity=".45" transform="rotate(-14 110 102)" />
      {/* słomka */}
      <rect x="106" y="18" width="7" height="70" rx="3.5" fill="#B7382F" transform="rotate(14 109 53)" />
      <path d="M68 42 L132 42" stroke="#E3D9C8" strokeWidth="2" />
    </>
  );
}

function Tiramisu() {
  return (
    <>
      <ellipse cx="100" cy="150" rx="72" ry="12" fill="#000" opacity=".06" />
      <ellipse cx="100" cy="144" rx="72" ry="12" fill="#fff" />
      <ellipse cx="100" cy="144" rx="72" ry="12" fill="none" stroke="#E8E0D2" strokeWidth="1.5" />
      <g transform="rotate(-6 100 110)">
        <rect x="58" y="118" width="84" height="14" rx="3" fill="#8A5A3B" />
        <rect x="58" y="106" width="84" height="12" rx="2" fill="#F0E3C8" />
        <rect x="58" y="94" width="84" height="12" rx="2" fill="#8A5A3B" />
        <rect x="58" y="82" width="84" height="12" rx="2" fill="#F0E3C8" />
        <rect x="56" y="70" width="88" height="14" rx="4" fill="#5D3A22" opacity=".95" />
        <circle cx="80" cy="72" r="2" fill="#3E2413" />
        <circle cx="103" cy="70" r="2" fill="#3E2413" />
        <circle cx="122" cy="73" r="2" fill="#3E2413" />
      </g>
      <Basil x={143} y={128} r={20} />
    </>
  );
}

function PannaCotta() {
  return (
    <>
      <ellipse cx="100" cy="150" rx="72" ry="12" fill="#000" opacity=".06" />
      <ellipse cx="100" cy="144" rx="72" ry="12" fill="#fff" />
      <ellipse cx="100" cy="144" rx="72" ry="12" fill="none" stroke="#E8E0D2" strokeWidth="1.5" />
      <path d="M64 138 Q64 96 100 92 Q136 96 136 138 Q118 146 100 146 Q82 146 64 138 Z" fill="#F7EFE2" />
      <path d="M70 118 Q100 96 130 118 Q126 104 100 100 Q74 104 70 118 Z" fill="#B7382F" opacity=".85" />
      <circle cx="96" cy="102" r="5" fill="#8E2C24" />
      <circle cx="110" cy="106" r="4" fill="#8E2C24" />
      <Basil x={124} y={98} r={-15} />
    </>
  );
}

function Generic() {
  return (
    <>
      <ellipse cx="100" cy="150" rx="72" ry="12" fill="#000" opacity=".06" />
      <circle cx="100" cy="104" r="70" fill="#fff" />
      <circle cx="100" cy="104" r="70" fill="none" stroke="#E8E0D2" strokeWidth="1.5" />
      <circle cx="100" cy="104" r="46" fill="#F0E7D4" />
      <path d="M76 104 Q100 84 124 104 Q100 124 76 104 Z" fill="#C6503C" opacity=".8" />
      <Basil x={100} y={92} r={10} />
    </>
  );
}

export function DishArt({ kind, className }: { kind: DishKind; className?: string }) {
  let body: React.ReactNode;
  switch (kind) {
    case "margherita":
      body = (
        <PizzaBase>
          <Basil x={86} y={78} r={10} />
          <Basil x={120} y={96} r={-30} />
          <Basil x={92} y={124} r={45} />
          <Basil x={68} y={102} r={-10} />
          <circle cx="108" cy="84" r="7" fill="#FBF4E4" opacity=".9" />
          <circle cx="82" cy="110" r="6" fill="#FBF4E4" opacity=".9" />
          <circle cx="122" cy="118" r="6.5" fill="#FBF4E4" opacity=".9" />
        </PizzaBase>
      );
      break;
    case "capricciosa":
      body = (
        <PizzaBase>
          <Ham x={84} y={82} r={-15} />
          <Ham x={122} y={112} r={30} />
          <Mushroom x={112} y={78} r={-20} />
          <Mushroom x={76} y={112} r={15} />
          <Mushroom x={98} y={132} r={-5} />
          <Basil x={100} y={100} r={20} />
        </PizzaBase>
      );
      break;
    case "diavola":
      body = (
        <PizzaBase>
          <Salami x={84} y={80} />
          <Salami x={118} y={90} />
          <Salami x={74} y={112} />
          <Salami x={104} y={124} />
          <Salami x={128} y={118} />
          <path d="M96 64 q4 -6 0 -12" stroke="#C0392B" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Basil x={98} y={100} r={0} />
        </PizzaBase>
      );
      break;
    case "hawajska":
      body = (
        <PizzaBase>
          <Pineapple x={86} y={80} r={-10} />
          <Pineapple x={118} y={94} r={25} />
          <Pineapple x={78} y={116} r={40} />
          <Pineapple x={110} y={126} r={-20} />
          <Ham x={100} y={100} r={10} />
          <Ham x={126} y={116} r={-25} />
        </PizzaBase>
      );
      break;
    case "formaggi":
      body = (
        <PizzaBase>
          <CheesePatch x={84} y={84} c="#F7E9C4" />
          <CheesePatch x={118} y={92} c="#EBCF8F" />
          <CheesePatch x={80} y={118} c="#F2E3B7" />
          <CheesePatch x={112} y={122} c="#E5C377" />
          <circle cx="97" cy="103" r="2.2" fill="#7FA05A" />
          <circle cx="107" cy="88" r="1.8" fill="#7FA05A" />
          <circle cx="90" cy="98" r="1.6" fill="#7FA05A" />
        </PizzaBase>
      );
      break;
    case "wiejska":
      body = (
        <PizzaBase>
          <Bacon x={88} y={82} r={-12} />
          <Bacon x={116} y={104} r={28} />
          <Bacon x={84} y={122} r={8} />
          <circle cx="108" cy="80" r="5" fill="#E9D9BC" stroke="#CBB89B" strokeWidth="1" />
          <circle cx="72" cy="102" r="5" fill="#E9D9BC" stroke="#CBB89B" strokeWidth="1" />
          <circle cx="122" cy="128" r="5" fill="#E9D9BC" stroke="#CBB89B" strokeWidth="1" />
          <Basil x={100} y={104} r={30} />
        </PizzaBase>
      );
      break;
    case "cola":
      body = <Glass liquid="#5A3A28" light="#8B5E3C" />;
      break;
    case "sok":
      body = <Glass liquid="#E8963C" light="#F5B95C" />;
      break;
    case "woda":
      body = <Glass liquid="#BFD9E4" light="#E4F1F6" />;
      break;
    case "tiramisu":
      body = <Tiramisu />;
      break;
    case "pannacotta":
      body = <PannaCotta />;
      break;
    default:
      body = <Generic />;
  }

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-hidden="true">
      {body}
    </svg>
  );
}
