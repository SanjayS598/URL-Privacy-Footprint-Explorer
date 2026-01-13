import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Footprint Explorer',
  description: 'Analyze websites for privacy concerns and tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
