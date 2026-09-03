"use client";

const CALENDLY_URL = "https://calendly.com/mayanksodhi11/30min?hide_event_type_details=1";

export function CalendlyLoader() {
  return null;
}

export function CalendlyLink({ children, className, onClick }) {
  return (
    <a
      className={className}
      href={CALENDLY_URL}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
