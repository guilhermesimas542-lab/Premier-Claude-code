import roboPremier from "@/assets/robo-premier.png";

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
      <img
        src={roboPremier}
        alt="Premier Robot"
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
