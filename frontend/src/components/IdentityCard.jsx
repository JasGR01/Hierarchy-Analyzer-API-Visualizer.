import styles from "./IdentityCard.module.css";

/**
 * IdentityCard
 * Displays the user_id, email_id, and college_roll_number returned by the API.
 */
export default function IdentityCard({ userId, emailId, rollNumber }) {
  const fields = [
    { label: "User ID",      value: userId      },
    { label: "Email",        value: emailId     },
    { label: "Roll Number",  value: rollNumber  },
  ];

  return (
    <div className={styles.card} aria-label="Identity information">
      {fields.map(({ label, value }) => (
        <div key={label} className={styles.field}>
          <span className={styles.label}>{label}</span>
          <span className={`${styles.value} mono`}>{value}</span>
        </div>
      ))}
    </div>
  );
}
