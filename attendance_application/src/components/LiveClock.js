import { useState, useEffect } from "react";

export default function LiveClock({ className }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatted = `${time.toLocaleTimeString()}  ${time.getMonth()+1}/${time.getDate()}/${time.getFullYear().toString().slice(-2)}`;

  return (
    <span className={className ? className : "live-clock-box"}>
      {formatted}
    </span>
  );
}