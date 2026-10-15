// src/components/build-project/ConstructionGrid.tsx
import { motion } from "framer-motion";

/**
 * Stripe-style background — clean white base with violet accent washes.
 */
const ConstructionGrid = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Clean white base */}
    <div className="absolute inset-0 bg-white" />

    {/* Top-left violet wash */}
    <motion.div
      className="absolute -top-[20%] -left-[15%] w-[60%] h-[60%] rounded-lg blur-[120px]"
      style={{
        background:
          "radial-gradient(circle, rgba(255,102,0,0.15), rgba(255,102,0,0.08), transparent 70%)",
      }}
      animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Top-right violet wash */}
    <motion.div
      className="absolute -top-[10%] -right-[10%] w-[50%] h-[55%] rounded-lg blur-[110px]"
      style={{
        background:
          "radial-gradient(circle, rgba(255,102,0,0.12), rgba(255,140,60,0.08), transparent 70%)",
      }}
      animate={{ x: [0, -20, 0], y: [0, 15, 0], scale: [1, 1.08, 1] }}
      transition={{
        duration: 18,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 3,
      }}
    />

    {/* Center subtle violet glow */}
    <motion.div
      className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-lg blur-[140px]"
      style={{
        background:
          "radial-gradient(circle, rgba(255,102,0,0.1), transparent 70%)",
      }}
      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 15, repeat: Infinity }}
    />

    {/* Bottom gradient fade — subtle violet horizon */}
    <div
      className="absolute bottom-0 left-0 right-0 h-[40%]"
      style={{
        background:
          "linear-gradient(to top, rgba(255,102,0,0.08), rgba(255,102,0,0.04) 50%, transparent)",
      }}
    />

    {/* Subtle grid pattern overlay */}
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `
          linear-gradient(to right, #e5e5e5 1px, transparent 1px),
          linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
    />

    {/* Diagonal line accents */}
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.03]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="diagonalLines"
          patternUnits="userSpaceOnUse"
          width="100"
          height="100"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="100"
            stroke="#000000"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#diagonalLines)" />
    </svg>
  </div>
);

export default ConstructionGrid;
