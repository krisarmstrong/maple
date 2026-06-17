interface SectionHeadingProps {
  title: string;
  hint: string;
}

/**
 * Heading for an option group: a title plus a one-line purpose hint so the
 * dense option grids scan quickly. Spans the full grid width.
 */
export function SectionHeading({ title, hint }: SectionHeadingProps): React.JSX.Element {
  return (
    <div className="option-section-heading">
      <h4>{title}</h4>
      <p className="option-section-hint">{hint}</p>
    </div>
  );
}
