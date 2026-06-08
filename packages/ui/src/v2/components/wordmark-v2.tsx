import { createUniqueId, type ComponentProps } from "solid-js"

export function WordmarkV2(props: Pick<ComponentProps<"svg">, "class">) {
  const gradient = createUniqueId()
  const glow = createUniqueId()

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 720 129"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      classList={{ [props.class ?? ""]: !!props.class }}
      role="img"
      aria-label="MarsbotCode"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="720" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffd447" />
          <stop offset="0.52" stop-color="#ff9f1c" />
          <stop offset="1" stop-color="#ff6b2b" />
        </linearGradient>
        <filter id={glow} x="-5%" y="-20%" width="110%" height="150%" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#ff9f1c" flood-opacity="0.18" />
        </filter>
      </defs>
      <rect width="720" height="129" rx="18" fill="currentColor" opacity="0.06" />
      <text
        x="36"
        y="86"
        fill={`url(#${gradient})`}
        filter={`url(#${glow})`}
        font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        font-size="70"
        font-weight="800"
        letter-spacing="0"
      >
        MarsbotCode
      </text>
    </svg>
  )
}
