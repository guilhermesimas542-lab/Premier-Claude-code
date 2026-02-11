const BackgroundLightTrail = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Trail 1 */}
      <div
        className="absolute w-[600px] h-[120px] light-trail-1"
        style={{
          top: "20%",
          left: "-10%",
          background:
            "radial-gradient(ellipse at center, rgba(201,182,255,0.08) 0%, transparent 70%)",
          filter: "blur(14px)",
        }}
      />
      {/* Trail 2 — only on larger screens */}
      <div
        className="absolute w-[500px] h-[100px] light-trail-2 hidden sm:block"
        style={{
          bottom: "25%",
          right: "-10%",
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%)",
          filter: "blur(16px)",
        }}
      />
    </div>
  );
};

export default BackgroundLightTrail;
