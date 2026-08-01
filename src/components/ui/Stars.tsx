import { C, MONO } from "@/styles/tokens";
import { Star } from "lucide-react";

export function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          strokeWidth={2}
          style={{ color: i <= Math.round(n) ? C.ki : C.keisen }}
          fill={i <= Math.round(n) ? C.ki : "none"}
        />
      ))}
      <span className="text-[14px] font-extrabold ml-1" style={{ color: C.sumi, fontFamily: MONO }}>
        {n.toFixed(1)}
      </span>
    </div>
  );
}
