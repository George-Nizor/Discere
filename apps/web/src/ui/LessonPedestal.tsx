import { useId } from "react";
export function LessonPedestal({ done, active }: { done: boolean; active: boolean }) {
  const id = useId().replaceAll(":", "");
  const gold = done || active;
  return (
    <svg aria-hidden="true" className="lesson-pedestal" viewBox="0 0 160 120" fill="none">
      <defs>
        <linearGradient
          id={id + "-rim"}
          x1="20"
          y1="70"
          x2="145"
          y2="112"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={gold ? "#AC7F0A" : "#3A3D42"} />
          <stop offset=".4" stopColor={gold ? "#F1BE19" : "#555960"} />
          <stop offset="1" stopColor={gold ? "#725008" : "#272A2E"} />
        </linearGradient>
        <linearGradient
          id={id + "-top"}
          x1="38"
          y1="42"
          x2="130"
          y2="93"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={gold ? "#FFE27A" : "#666C75"} />
          <stop offset="1" stopColor={gold ? "#E5AF0B" : "#3C4149"} />
        </linearGradient>
        <linearGradient
          id={id + "-beam"}
          x1="80"
          y1="10"
          x2="80"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A7FA9C" stopOpacity="0" />
          <stop offset="1" stopColor="#E5FFBE" stopOpacity=".8" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="107" rx="61" ry="9" fill="#000" opacity=".32" />
      {active ? (
        <ellipse
          className="pedestal-orbit"
          cx="80"
          cy="83"
          rx="74"
          ry="33"
          stroke="#F4CC42"
          strokeWidth="3"
          opacity=".55"
        />
      ) : null}
      <path d="M20 73V84C20 103 140 103 140 84V73Z" fill={"url(#" + id + "-rim)"} />
      <ellipse cx="80" cy="73" rx="60" ry="27" fill={"url(#" + id + "-top)"} />
      <ellipse
        cx="80"
        cy="70"
        rx="46"
        ry="21"
        stroke={gold ? "#FFF2A5" : "#858B94"}
        strokeWidth="5"
      />
      {active ? (
        <>
          <path d="M37 18L36 72Q80 94 124 72L123 18Z" fill={"url(#" + id + "-beam)"} />
          <ellipse cx="80" cy="70" rx="39" ry="17" fill="#F6FFE2" />
        </>
      ) : done ? (
        <path
          d="M66 69L76 77L96 61"
          stroke="#FFF6C9"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path d="M76 60L89 69L76 78Z" fill="#C9CDD3" />
      )}
      <path
        d="M53 52L63 49M92 49L105 53"
        stroke={gold ? "#FFF7BA" : "#9CA1AA"}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
