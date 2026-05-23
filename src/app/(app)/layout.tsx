import { BottomTabBar } from '@/components/layout/BottomTabBar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <BottomTabBar />
    </>
  )
}
