import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export function SelectorComodines({ cantidad, children }) {
    return _jsxs("details", { className: "a-selector-comodines", children: [_jsxs("summary", { children: ["\u26A1 Comodines (", cantidad, ")"] }), _jsx("div", { className: "a-mano", "aria-label": "Tus comodines", children: children })] });
}
