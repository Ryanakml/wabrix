import Image from "next/image"
import React from "react"

export function WabrixLogo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Wabrix Logo"
        width={110}
        height={38}
        className="h-auto w-auto"
      />
    </div>

  )
}

