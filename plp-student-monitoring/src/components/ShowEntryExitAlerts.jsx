
import Swal from 'sweetalert2';

const ENTRY_GREETINGS = [
  "Mabuhay! Ready to learn",
  "Kamusta! Let's start the day",
  "Magandang Araw",
  "Magandang Araw! Keep it up",
  "Kumusta? Attendance check",
  "Hi! Ready for class",
  "Maligayang pagdating!",
  "Welcome back! Let's have a great day",
  "Pasok na, Anoh Tarah?"
];

const EXIT_GREETINGS = [
  "Ingat sa paguwi!",
  "Salamat! Bumalik ka agad ha",
  "See you later",
  "Take care out there",
  "Hanggang muli",
  "Stay safe",
  "Come back soon",
];


const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function showEntryExitAlert({ action, student, department, time }) {
  const isEntry    = action === 'ENTRY';
  const greeting   = getRandom(isEntry ? ENTRY_GREETINGS : EXIT_GREETINGS);
  const themeColor = isEntry ? '#01311d' : '#587f1d';
  const iconColor  = isEntry ? '#86efac' : '#d9fca5';
  const badgeText  = isEntry ? 'ENTRY RECORDED' : 'EXIT RECORDED';
  const badgeBg    = isEntry ? 'rgba(34,197,94,0.15)' : 'rgba(88,127,29,0.15)';
  const badgeBorder= isEntry ? 'rgba(34,197,94,0.4)'  : 'rgba(217,252,165,0.4)';

  // Use the passed time or generate one from the client clock as fallback
  const displayTime = time ?? new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());

  Swal.fire({
    html: `
      <div style="
        font-family: 'Montserrat', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-radius: 12px;
      ">
        <div style="
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: ${iconColor};
          background: ${badgeBg};
          border: 1px solid ${badgeBorder};
          border-radius: 5px;
          padding: 4px 16px;
        ">${badgeText}</div>

        <p style="
          font-size: 1.1rem;
          color: rgba(255,255,255,0.75);
          margin: 0;
          font-weight: 400;
          text-align: center;
        ">${greeting}</p>

        <p style="
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          line-height: 1.2;
          text-align: center;
        ">${student}</p>

        <p style="
          font-size: 0.82rem;
          color: rgba(255,255,255,0.6);
          margin: 0;
          font-weight: 500;
          letter-spacing: 0.04em;
        ">${department}</p>

        <!-- Time -->
        <p style="
          font-size: 0.78rem;
          color: ${iconColor};
          margin: 0;
          font-weight: 600;
          letter-spacing: 0.06em;
          opacity: 0.85;
        ">${displayTime}</p>
      </div>
    `,
    background:        themeColor,
    timer:             1500,
    timerProgressBar:  true,
    showConfirmButton: false,
    width:             '360px',
    padding:           '1.8rem',
    backdrop:          'rgba(0,0,0,0.65) center top no-repeat',
    customClass: {
      popup:            'entry-alert-popup',
      timerProgressBar: 'entry-alert-progress',
    },
    didOpen: (popup) => {
      const bar = popup.querySelector('.swal2-timer-progress-bar');
      if (bar) {
        bar.style.background = iconColor;
        bar.style.opacity    = '0.5';
      }
    },
  });
}