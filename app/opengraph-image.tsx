import { ImageResponse } from "next/og";

export const alt =
  "The Daily Brief — Wake up already briefed. 6:00 AM Mountain.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const bg = "#f5efe2";
const ink = "#1a1714";
const accent = "#a44918";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: bg,
          backgroundImage:
            "radial-gradient(900px 400px at 88% -10%, rgba(164, 73, 24, 0.18), transparent 55%), radial-gradient(700px 400px at 0% 100%, rgba(184, 136, 54, 0.14), transparent 58%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: ink,
              color: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: "italic",
              letterSpacing: "-0.03em",
            }}
          >
            R
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 40,
                color: ink,
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: "-0.02em",
              }}
            >
              The Daily{" "}
            </span>
            <span
              style={{
                fontSize: 40,
                fontStyle: "italic",
                color: accent,
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: "-0.02em",
              }}
            >
              Brief
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <span
            style={{
              alignSelf: "flex-start",
              fontSize: 16,
              fontFamily:
                '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
            }}
          >
            A daily decision brief
          </span>
          <div
            style={{
              height: 4,
              alignSelf: "flex-start",
              width: 880,
              background: accent,
              borderRadius: 4,
            }}
          />

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: 18,
              rowGap: 8,
              fontSize: 54,
              letterSpacing: "-0.03em",
              color: ink,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            <span style={{ lineHeight: 0.95 }}>Wake up</span>
            <span style={{ fontStyle: "italic", color: accent, lineHeight: 0.95 }}>
              already
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ lineHeight: 0.95 }}>briefed.</span>
              <div
                style={{
                  height: 5,
                  width: 248,
                  backgroundColor: accent,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>

          <span
            style={{
              marginTop: 4,
              fontSize: 20,
              lineHeight: 1.4,
              color: ink,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              maxWidth: 720,
            }}
          >
            Nine beats ranked. One email at 6:00 AM Mountain. Built for operators
            who need signal — not noise.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontFamily:
                '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
            }}
          >
            roymcfarland.news · 6:00 Denver
          </span>
          <span
            style={{
              fontSize: 15,
              fontFamily:
                '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
              opacity: 0.92,
            }}
          >
            Signal ranked · Noise dropped
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
