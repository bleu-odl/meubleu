import { HTMLAttributes } from "react"

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800/50 ${className}`}
      {...props}
    />
  )
}