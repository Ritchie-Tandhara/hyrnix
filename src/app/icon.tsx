import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6d28d9",
          borderRadius: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 64 64">
          <path
            d="M32 14 C33 22 34 30 42 32 C34 34 33 42 32 50 C31 42 30 34 22 32 C30 30 31 22 32 14 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
