import React from "react";

interface ShirtIconProps {
  variant: "solid" | "stripes";
  primaryColor: string;
  secondaryColor?: string;
  size?: number;
}

export const ShirtIcon: React.FC<ShirtIconProps> = ({
  variant,
  primaryColor,
  secondaryColor = "#FFFFFF",
  size = 28,
}) => {
  const patternId = `stripes-${primaryColor.replace("#", "")}-${secondaryColor.replace("#", "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Define stripes pattern */}
      {variant === "stripes" && (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="8"
            height="64"
          >
            <rect x="0" y="0" width="4" height="64" fill={primaryColor} />
            <rect x="4" y="0" width="4" height="64" fill={secondaryColor} />
          </pattern>
        </defs>
      )}

      {/* Shirt silhouette - simple jersey shape with collar and sleeves */}
      <path
        d="
          M 20 8
          L 12 12
          L 4 20
          L 8 24
          L 12 22
          L 12 56
          L 52 56
          L 52 22
          L 56 24
          L 60 20
          L 52 12
          L 44 8
          C 42 14 38 18 32 18
          C 26 18 22 14 20 8
          Z
        "
        fill={variant === "stripes" ? `url(#${patternId})` : primaryColor}
        stroke={variant === "stripes" ? secondaryColor : primaryColor}
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Collar detail */}
      <path
        d="
          M 20 8
          C 22 14 26 18 32 18
          C 38 18 42 14 44 8
          C 40 6 36 5 32 5
          C 28 5 24 6 20 8
          Z
        "
        fill={variant === "stripes" ? secondaryColor : primaryColor}
        stroke={variant === "stripes" ? primaryColor : "rgba(0,0,0,0.2)"}
        strokeWidth="1"
        opacity="0.9"
      />
    </svg>
  );
};
