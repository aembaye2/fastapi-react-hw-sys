import { Fragment } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

const INLINE_MATH_PATTERN = /(\$[^$]+\$)/g;

const MathText = ({ text = "", className = "" }) => {
  const value = String(text || "");
  const parts = value.split(INLINE_MATH_PATTERN);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const expression = part.slice(1, -1).trim();
          if (!expression) {
            return <Fragment key={index}>{part}</Fragment>;
          }

          try {
            return <InlineMath key={index} math={expression} />;
          } catch {
            return <Fragment key={index}>{part}</Fragment>;
          }
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </span>
  );
};

export default MathText;
