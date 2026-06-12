export default function Disclaimer({ expanded = false }) {
  return (
    <p style={styles.note}>
      <strong>PS:</strong> This is a student statistics project. Probabilities are
      model estimates and are frequently wrong — they are not betting advice.
      {expanded &&
        " Any gambling decision or bet made based on these predictions is your own responsibility; nothing on this site should inform it. The model exists for learning and for fun."}
      {!expanded && " If you gamble, nothing here should inform it."}
    </p>
  );
}

const styles = {
  note: {
    color: "var(--text-low)",
    fontSize: 12,
    lineHeight: 1.5,
    borderLeft: "3px solid var(--line)",
    paddingLeft: 10,
    margin: "12px 0 0",
  },
};
