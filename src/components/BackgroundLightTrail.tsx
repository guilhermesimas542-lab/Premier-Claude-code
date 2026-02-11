const BackgroundLightTrail = () => {
  return (
    <div className="absolute inset-0 z-[5] overflow-hidden pointer-events-none">
      {/* Trail 1 */}
      <div
        className="absolute light-trail-1"
        style={{
          width: "700px",
          height: "180px",
          top: "15%",
          left: "-15%",
          background:
            "radial-gradient(ellipse at center, rgba(201,182,255,0.35) 0%, rgba(140,100,255,0.12) 40%, transparent 70%)",
          filter: "blur(18px)",
          borderRadius: "50%",
        }}
      />
      {/* Trail 2 */}
      <div
        className="absolute light-trail-2"
        style={{
          width: "600px",
          height: "150px",
          bottom: "20%",
          right: "-15%",
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, rgba(200,180,255,0.08) 40%, transparent 70%)",
          filter: "blur(20px)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
};

export default BackgroundLightTrail;
