const AnimatedFootballIcon = () => {
  return (
    <div
      style={{
        width: 90,
        height: 90,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <video
        src="/images/robo_premier_bola_fogo.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
};

export default AnimatedFootballIcon;
