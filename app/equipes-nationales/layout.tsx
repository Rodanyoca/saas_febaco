import { Sidebar } from "@/components/dashboard/sidebar"
export default function Layout({children}:{children:React.ReactNode}){return <div className="min-h-screen bg-background"><Sidebar/><main className="min-w-0 pl-64 transition-all duration-300">{children}</main></div>}
