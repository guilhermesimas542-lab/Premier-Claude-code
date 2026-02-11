const BackgroundLightTrail = () => {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 2, mixBlendMode: "screen" }}
    >
      {/* Trail 1 - lilac */}
      <div
        className="light-trail-1"
        style={{
          position: "absolute",
          width: "60%",
          height: "200px",
          top: "18%",
          left: "-10%",
          background:
            "radial-gradient(ellipse at center, rgba(180,150,255,0.5) 0%, rgba(140,100,255,0.15) 40%, transparent 70%)",
          filter: "blur(30px)",
          borderRadius: "50%",
        }}
      />
      {/* Trail 2 - white */}
      <div
        className="light-trail-2"
        style={{
          position: "absolute",
          width: "50%",
          height: "160px",
          bottom: "22%",
          right: "-10%",
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, rgba(200,180,255,0.1) 40%, transparent 70%)",
          filter: "blur(30px)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
};

export default BackgroundLightTrail;
