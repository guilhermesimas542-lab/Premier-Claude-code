import roboCassino from "@/assets/robo-cassino.png";

const AnimatedSlotIcon = () => {
  return (
    <div
      style={{
        width: 90,
        height: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <img
        src={roboCassino}
        alt="Painel de Apostas IA"
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

export default AnimatedSlotIcon;
