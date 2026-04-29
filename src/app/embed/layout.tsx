export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0d0d0d] text-gray-900 dark:text-white p-4 md:p-6">
      {children}
    </div>
  );
}
