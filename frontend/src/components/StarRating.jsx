export default function StarRating({ value = 0, onChange, size, label }) {
  const stars = [1, 2, 3, 4, 5];
  if (onChange) {
    return (
      <div role="radiogroup" aria-label={label || 'Rating'} className="stars">
        {stars.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`star-btn${n <= value ? ' on' : ''}`}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
      </div>
    );
  }
  const rounded = Math.round(value);
  return (
    <span className="stars" role="img" aria-label={`${value ? value.toFixed(1) : 'No'} out of 5 stars`} style={size ? { fontSize: size } : undefined}>
      {stars.map((n) => (
        <span key={n} className={`star${n <= rounded ? ' on' : ''}`}>★</span>
      ))}
    </span>
  );
}
