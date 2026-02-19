import { useEffect, useState } from "react";

const SYMBOLS = ["🍒", "🍋", "⭐", "7️⃣", "💎", "🔔"];
const FINAL_SYMBOL = "7️⃣";
const SPIN_DURATION = 2500; // ms spinning
const STOP_STAGGER = 400;   // ms between each reel stopping
const PAUSE_DURATION = 1500; // ms paused at 777 before restart

const Reel = ({
  spinning,
  finalSymbol,
  stopDelay,
}: {
  spinning: boolean;
  finalSymbol: string;
  stopDelay: number;
}) => {
  const [current, setCurrent] = useState(SYMBOLS[0]);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (!spinning) {
      setStopped(false);
      setCurrent(SYMBOLS[0]);
      return;
    }

    setStopped(false);
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % SYMBOLS.length;
      setCurrent(SYMBOLS[idx]);
    }, 80);

    const stopTimer = setTimeout(() => {
      clearInterval(interval);
      setCurrent(finalSymbol);
      setStopped(true);
    }, SPIN_DURATION + stopDelay);

    return () => {
      clearInterval(interval);
      clearTimeout(stopTimer);
    };
  }, [spinning, finalSymbol, stopDelay]);

  return (
    <div
      style={{
        width: 18,
        height: 22,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        borderRadius: 3,
        border: "1px solid rgba(168,85,247,0.3)",
        fontSize: 13,
        lineHeight: 1,
        transition: stopped ? "none" : undefined,
      }}
    >
      <span style={{ display: "block" }}>{current}</span>
    </div>
  );
};

const AnimatedSlotIcon = () => {
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    const totalSpinTime = SPIN_DURATION + STOP_STAGGER * 2;
    const cycle = () => {
      setSpinning(true);
      const stopTimer = setTimeout(() => {
        setSpinning(false);
        const restartTimer = setTimeout(() => {
          cycle();
        }, PAUSE_DURATION);
        return () => clearTimeout(restartTimer);
      }, totalSpinTime);
      return () => clearTimeout(stopTimer);
    };

    const cleanup = cycle();
    return cleanup;
  }, []);

  return (
    <div
      style={{
        width: 30,
        height: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
      }}
    >
      {/* Machine top bar */}
      <div
        style={{
          width: 26,
          height: 4,
          background: "linear-gradient(90deg, #A855F7, #7C3AED)",
          borderRadius: "3px 3px 0 0",
        }}
      />
      {/* Reels row */}
      <div style={{ display: "flex", gap: 2 }}>
        <Reel spinning={spinning} finalSymbol={FINAL_SYMBOL} stopDelay={0} />
        <Reel spinning={spinning} finalSymbol={FINAL_SYMBOL} stopDelay={STOP_STAGGER} />
        <Reel spinning={spinning} finalSymbol={FINAL_SYMBOL} stopDelay={STOP_STAGGER * 2} />
      </div>
      {/* Machine bottom bar */}
      <div
        style={{
          width: 26,
          height: 3,
          background: "linear-gradient(90deg, #7C3AED, #A855F7)",
          borderRadius: "0 0 3px 3px",
        }}
      />
    </div>
  );
};

export default AnimatedSlotIcon;
