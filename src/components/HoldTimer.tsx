"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface HoldTimerProps {
  expiryTime: string | Date;
  onExpire?: () => void;
  className?: string;
  showIcon?: boolean;
}

export function HoldTimer({
  expiryTime,
  onExpire,
  className = "",
  showIcon = true,
}: HoldTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const expiry = new Date(expiryTime).getTime();
      const now = Date.now();
      const remaining = expiry - now;

      if (remaining <= 0) {
        setTimeLeft("00:00");
        onExpire?.();
        return;
      }

      if (remaining < 120000) {
        setIsUrgent(true);
      }

      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiryTime, onExpire]);

  return (
    <div
      className={`flex items-center gap-2 font-mono font-bold ${
        isUrgent ? "animate-pulse text-red-600" : "text-orange-600"
      } ${className}`}
    >
      {showIcon && <Clock className="h-4 w-4" />}
      <span>{timeLeft}</span>
    </div>
  );
}
