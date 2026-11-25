import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "8-Bit Arcade Duo",
  description: "Retro 8-Bit Multiplayer Arcade Games",
};

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden", backgroundColor: "#000" }}>
      <iframe
        src="/8bit_arcade_duo.html"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="8-Bit Arcade Duo"
        allow="autoplay; fullscreen"
      />
    </main>
  );
}
