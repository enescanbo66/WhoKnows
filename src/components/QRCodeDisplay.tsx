import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  joinUrl: string
  joinCode: string
}

export default function QRCodeDisplay({ joinUrl, joinCode }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-white p-4 rounded-2xl shadow-2xl">
        <QRCodeSVG value={joinUrl} size={220} level="H" />
      </div>
      <div className="text-center">
        <p className="text-white/60 text-sm font-medium mb-1">
          Or go to this URL &amp; enter the code
        </p>
        <p className="text-4xl font-black tracking-[0.3em] text-brand-accent">
          {joinCode}
        </p>
      </div>
    </div>
  )
}
